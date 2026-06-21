import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const secret = process.env.STRIPE_SECRET_KEY || this.config.get<string>('STRIPE_SECRET_KEY');
    if (secret) {
      this.stripe = new Stripe(secret);
    }
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe não configurado. Defina STRIPE_SECRET_KEY no servidor.');
    }
    return this.stripe;
  }

  private appUrl(): string {
    return (
      process.env.APP_URL ||
      this.config.get<string>('APP_URL') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  private trialDays(): number {
    const raw = process.env.STRIPE_TRIAL_DAYS || this.config.get<string>('STRIPE_TRIAL_DAYS') || '0';
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  async getPublicPlan() {
    const trialDays = this.trialDays();
    const priceId = process.env.STRIPE_PRICE_ID || this.config.get<string>('STRIPE_PRICE_ID');

    if (!this.stripe || !priceId) {
      return {
        priceLabel: 'Consulte',
        amount: null,
        currency: 'brl',
        interval: 'month',
        trialDays,
        productName: 'Barber CRM Pro',
      };
    }

    try {
      const price = await this.stripe.prices.retrieve(priceId, { expand: ['product'] });
      const amount = price.unit_amount != null ? price.unit_amount / 100 : null;
      const currency = (price.currency || 'brl').toUpperCase();
      const interval = price.recurring?.interval || 'month';
      const intervalLabel = interval === 'month' ? 'mês' : interval === 'year' ? 'ano' : interval;
      const priceLabel =
        amount != null
          ? `${amount.toLocaleString('pt-BR', { style: 'currency', currency })}/${intervalLabel}`
          : 'Consulte';
      const product = price.product as Stripe.Product | string;
      const productName = typeof product === 'string' ? 'Barber CRM Pro' : product.name;

      return { priceLabel, amount, currency, interval, trialDays, productName };
    } catch {
      return {
        priceLabel: 'Consulte',
        amount: null,
        currency: 'BRL',
        interval: 'month',
        trialDays,
        productName: 'Barber CRM Pro',
      };
    }
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        currentPeriodEnd: true,
        stripeCustomerId: true,
      },
    });
    if (!user) throw new BadRequestException('Usuário não encontrado');
    return {
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      hasCustomer: Boolean(user.stripeCustomerId),
      isActive: ['active', 'trialing'].includes(user.subscriptionStatus),
    };
  }

  private async resolveStripeCustomerId(
    stripe: Stripe,
    user: { id: string; email: string; name: string; stripeCustomerId: string | null },
  ): Promise<string> {
    if (user.stripeCustomerId) {
      try {
        const existing = await stripe.customers.retrieve(user.stripeCustomerId);
        if (!('deleted' in existing && existing.deleted)) {
          return user.stripeCustomerId;
        }
      } catch (err: unknown) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code?: string }).code)
            : '';
        if (code !== 'resource_missing') throw err;
      }
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  async createCheckoutSession(userId: string) {
    const stripe = this.requireStripe();
    const priceId = process.env.STRIPE_PRICE_ID || this.config.get<string>('STRIPE_PRICE_ID');
    if (!priceId) {
      throw new ServiceUnavailableException('STRIPE_PRICE_ID não configurado.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const customerId = await this.resolveStripeCustomerId(stripe, user);

    const trialDays = this.trialDays();
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: { userId },
    };
    if (trialDays > 0) {
      subscriptionData.trial_period_days = trialDays;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.appUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.appUrl()}/billing?canceled=1`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: { userId },
      subscription_data: subscriptionData,
    });

    if (!session.url) throw new BadRequestException('Não foi possível criar sessão de checkout.');
    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    const stripe = this.requireStripe();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const customerId = await this.resolveStripeCustomerId(stripe, user);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.appUrl()}/settings`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const stripe = this.requireStripe();
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET || this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET não configurado.');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(
        `Webhook inválido: ${err instanceof Error ? err.message : 'erro'}`,
      );
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.onSubscriptionChanged(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id || session.metadata?.userId;
    if (!userId || !session.subscription) return;

    const stripe = this.requireStripe();
    const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
    await this.syncSubscription(userId, subscription, session.customer as string | undefined);
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = (
      invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
    ).subscription;
    if (!subscriptionId) return;

    const stripe = this.requireStripe();
    const subscription = await stripe.subscriptions.retrieve(String(subscriptionId));
    await this.onSubscriptionChanged(subscription);
  }

  private async onSubscriptionChanged(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.userId;
    let resolvedUserId: string | undefined = userId;

    if (!resolvedUserId) {
      const user = await this.prisma.user.findFirst({
        where: { stripeCustomerId: String(subscription.customer) },
        select: { id: true },
      });
      resolvedUserId = user?.id;
    }

    if (!resolvedUserId) return;
    await this.syncSubscription(resolvedUserId, subscription);
  }

  private async syncSubscription(
    userId: string,
    subscription: Stripe.Subscription,
    customerId?: string,
  ) {
    const rawEnd =
      (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end ??
      (subscription as { currentPeriodEnd?: number }).currentPeriodEnd;
    const periodEnd = rawEnd ? new Date(rawEnd * 1000) : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodEnd: periodEnd,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
      },
    });
  }
}
