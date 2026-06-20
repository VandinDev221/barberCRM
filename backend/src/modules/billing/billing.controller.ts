import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkipSubscription } from '../../common/decorators/skip-subscription.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  @Post('webhook')
  @SkipSubscription()
  @ApiOperation({ summary: 'Webhook Stripe (sem auth)' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Assinatura Stripe ausente');
    const rawBody = req.rawBody;
    if (!rawBody) throw new BadRequestException('Raw body ausente');
    return this.billing.handleWebhook(rawBody, signature);
  }

  @Get('status')
  @SkipSubscription()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status da assinatura do usuário logado' })
  status(@CurrentUser('sub') userId: string) {
    return this.billing.getStatus(userId);
  }

  @Post('checkout')
  @SkipSubscription()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar sessão Stripe Checkout' })
  checkout(@CurrentUser('sub') userId: string) {
    return this.billing.createCheckoutSession(userId);
  }

  @Post('portal')
  @SkipSubscription()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Portal do cliente Stripe (gerenciar assinatura)' })
  portal(@CurrentUser('sub') userId: string) {
    return this.billing.createPortalSession(userId);
  }
}
