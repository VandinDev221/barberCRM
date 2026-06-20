import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
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
        subscriptionStatus: user.subscriptionStatus,
      },
      subscriptionStatus: user.subscriptionStatus,
      ...tokens,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
      },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return {
      ...user,
      isActive: ['active', 'trialing'].includes(user.subscriptionStatus),
    };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (exists) {
      throw new UnauthorizedException('E-mail já cadastrado');
    }
    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: hash,
        name: dto.name,
        phone: dto.phone,
      },
    });
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
        subscriptionStatus: user.subscriptionStatus,
      },
      subscriptionStatus: user.subscriptionStatus,
      ...tokens,
    };
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      return { message: 'Se o e-mail existir, você receberá um link para redefinir a senha.' };
    }
    // TODO: enviar e-mail com link de reset (ex: SendGrid, Resend)
    // Por ora apenas retorna mensagem genérica
    return { message: 'Se o e-mail existir, você receberá um link para redefinir a senha.' };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logout realizado' };
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
