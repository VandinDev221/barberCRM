import { Injectable, UnauthorizedException, BadRequestException, ServiceUnavailableException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { generateUniqueSlug, isSlugAvailable, normalizeSlugInput, slugToDisplayName } from '../../common/utils/slug.util';
import { seedDefaultBarberData } from '../../common/utils/onboarding.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  private appUrl(): string {
    return (
      process.env.APP_URL ||
      this.config.get<string>('APP_URL') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  private passwordResetResponse() {
    return {
      message: 'Se o e-mail existir, você receberá um link para redefinir a senha.',
    };
  }

  private getGoogleClientId(): string | undefined {
    return process.env.GOOGLE_CLIENT_ID || this.config.get<string>('GOOGLE_CLIENT_ID');
  }

  private getGoogleClient(): OAuth2Client {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Login com Google não configurado. Defina GOOGLE_CLIENT_ID no servidor.',
      );
    }
    if (!this.googleClient) {
      this.googleClient = new OAuth2Client(clientId);
    }
    return this.googleClient;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Esta conta usa login com Google. Clique em "Continuar com Google".');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return this.buildAuthResponse(user);
  }

  async googleLogin(dto: GoogleAuthDto) {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new ServiceUnavailableException('Login com Google não configurado.');
    }

    const client = this.getGoogleClient();
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token do Google inválido ou expirado.');
    }

    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Token do Google inválido.');
    }

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name?.trim() || email.split('@')[0];
    const avatarUrl = payload.picture || null;

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      if (!dto.acceptTerms) {
        throw new BadRequestException(
          'Conta não encontrada. Crie sua conta em /register e aceite os Termos de Uso.',
        );
      }
      const slug = await generateUniqueSlug(this.prisma, name, email);
      user = await this.prisma.user.create({
        data: {
          email,
          googleId,
          name,
          avatarUrl,
          slug,
          onboardingCompleted: false,
        },
      });
      await seedDefaultBarberData(this.prisma, user.id);
    } else {
      if (!user.isActive) {
        throw new UnauthorizedException('Conta desativada.');
      }
      const updates: { googleId?: string; avatarUrl?: string | null; name?: string } = {};
      if (!user.googleId) updates.googleId = googleId;
      if (avatarUrl && !user.avatarUrl) updates.avatarUrl = avatarUrl;
      if (Object.keys(updates).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
    }

    return this.buildAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        slug: true,
        businessName: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        onboardingCompleted: true,
      },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    let slug = user.slug;
    if (!slug) {
      slug = await generateUniqueSlug(this.prisma, user.name, user.email);
      await this.prisma.user.update({ where: { id: userId }, data: { slug } });
    }

    return {
      ...user,
      slug,
      isActive: ['active', 'trialing'].includes(user.subscriptionStatus),
    };
  }

  async completeOnboarding(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });
    return { onboardingCompleted: true };
  }

  async updateSlug(userId: string, rawSlug: string, businessName?: string) {
    const slug = normalizeSlugInput(rawSlug);
    if (slug.length < 3) {
      throw new BadRequestException(
        'Informe um endereço válido com pelo menos 3 caracteres (letras, números ou hífens).',
      );
    }
    const available = await isSlugAvailable(this.prisma, slug, userId);
    if (!available) {
      throw new ConflictException(
        'Este endereço não está disponível. Escolha outro nome para o link.',
      );
    }

    let resolvedBusinessName = businessName?.trim();
    if (resolvedBusinessName && resolvedBusinessName.length < 2) {
      throw new BadRequestException('Informe o nome do estabelecimento com pelo menos 2 caracteres.');
    }
    if (!resolvedBusinessName) {
      resolvedBusinessName = slugToDisplayName(slug);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { slug, businessName: resolvedBusinessName },
      select: { slug: true, businessName: true },
    });

    return { slug: user.slug, businessName: user.businessName };
  }

  async register(dto: RegisterDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException('É necessário aceitar os Termos de Uso e a Política de Privacidade.');
    }
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (exists) {
      throw new UnauthorizedException('E-mail já cadastrado. Tente entrar com Google ou use outro e-mail.');
    }
    const hash = await bcrypt.hash(dto.password, 12);
    const slug = await generateUniqueSlug(this.prisma, dto.name, dto.email);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: hash,
        name: dto.name,
        phone: dto.phone,
        slug,
        onboardingCompleted: false,
      },
    });
    await seedDefaultBarberData(this.prisma, user.id);
    return this.buildAuthResponse(user);
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    const tokens = await this.issueTokens(user.id, user.email);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });
    return tokens;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const generic = this.passwordResetResponse();
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      return generic;
    }
    if (!user.passwordHash) {
      return generic;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const resetUrl = `${this.appUrl()}/reset-password?token=${token}`;

    try {
      await this.mail.sendPasswordReset({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (err) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: null, passwordResetExpiresAt: null },
      });
      if (!this.mail.isConfigured()) {
        throw new ServiceUnavailableException(
          'Envio de e-mail não configurado. Defina RESEND_API_KEY e EMAIL_FROM no servidor.',
        );
      }
      throw new InternalServerErrorException('Não foi possível enviar o e-mail. Tente novamente.');
    }

    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Link inválido ou expirado. Solicite um novo e-mail.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        refreshToken: null,
      },
    });

    return { message: 'Senha alterada com sucesso. Faça login com a nova senha.' };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logout realizado' };
  }

  private async buildAuthResponse(user: User) {
    const tokens = await this.issueTokens(user.id, user.email);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        slug: user.slug,
        subscriptionStatus: user.subscriptionStatus,
        onboardingCompleted: user.onboardingCompleted,
      },
      subscriptionStatus: user.subscriptionStatus,
      onboardingCompleted: user.onboardingCompleted,
      ...tokens,
    };
  }

  private async issueTokens(userId: string, email: string) {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || this.config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error(
        'JWT_REFRESH_SECRET não está definido. Adicione no .env do backend ou em Render → Environment.',
      );
    }
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: refreshSecret,
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    };
  }
}
