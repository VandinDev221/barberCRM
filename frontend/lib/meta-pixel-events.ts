/** Eventos padrão do Meta Pixel — https://developers.facebook.com/docs/meta-pixel/reference */

export function trackMetaPixel(
  event: 'PageView' | 'CompleteRegistration' | 'InitiateCheckout' | 'Subscribe' | 'Lead',
  params?: Record<string, string | number>,
) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', event, params);
}
