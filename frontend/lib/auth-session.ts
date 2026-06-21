export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  subscriptionStatus?: string;
  onboardingCompleted?: boolean;
};

export function persistAuthSession(res: AuthResponse): void {
  localStorage.setItem('accessToken', res.accessToken);
  localStorage.setItem('refreshToken', res.refreshToken);
}
