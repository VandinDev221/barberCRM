const ACTIVE = new Set(['active', 'trialing']);

export function isSubscriptionActive(status?: string | null): boolean {
  return Boolean(status && ACTIVE.has(status));
}

export type AuthRedirectUser = {
  subscriptionStatus?: string | null;
  onboardingCompleted?: boolean;
};

export function postAuthRedirect(user: AuthRedirectUser): string {
  if (!isSubscriptionActive(user.subscriptionStatus)) return '/billing';
  if (user.onboardingCompleted === false) return '/onboarding';
  return '/dashboard';
}
