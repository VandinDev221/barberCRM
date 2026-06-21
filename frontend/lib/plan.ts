import { apiGet } from '@/lib/api';

export type PlanInfo = {
  priceLabel: string;
  amount: number | null;
  currency: string;
  interval: string;
  trialDays: number;
  productName: string;
};

export async function fetchPublicPlan(): Promise<PlanInfo> {
  return apiGet<PlanInfo>('/public/plan');
}

export function bookingPath(slug: string): string {
  return `/agendar/${slug}`;
}

export function bookingUrl(slug: string): string {
  if (typeof window === 'undefined') return bookingPath(slug);
  return `${window.location.origin}${bookingPath(slug)}`;
}
