import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { SKIP_SUBSCRIPTION_KEY } from '../decorators/skip-subscription.decorator';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.BYPASS_SUBSCRIPTION === 'true') return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub as string | undefined;
    if (!userId) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });

    if (user && ACTIVE_STATUSES.has(user.subscriptionStatus)) return true;

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Assinatura ativa necessária para acessar a plataforma.',
      code: 'SUBSCRIPTION_REQUIRED',
    });
  }
}
