const ACTIVE = new Set(['active', 'trialing']);

export function isSubscriptionActive(status?: string | null): boolean {
  return Boolean(status && ACTIVE.has(status));
}

export function postAuthRedirect(subscriptionStatus?: string | null): string {
  return isSubscriptionActive(subscriptionStatus) ? '/dashboard' : '/billing';
}
