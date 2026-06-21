const SUPPORT_WHATSAPP_DIGITS = '98985894988';

export function formatSupportPhoneDisplay(): string {
  const d = SUPPORT_WHATSAPP_DIGITS;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function supportWhatsAppUrl(message?: string): string {
  const number = `55${SUPPORT_WHATSAPP_DIGITS}`;
  const base = `https://wa.me/${number}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}
