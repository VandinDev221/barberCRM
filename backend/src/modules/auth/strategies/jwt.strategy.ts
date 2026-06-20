import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = process.env.JWT_SECRET || config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET não está definido. Em produção (Render): Environment → adicione JWT_SECRET e JWT_REFRESH_SECRET. Local: .env (veja .env.example).',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return { sub: user.id, email: user.email };
  }
}
