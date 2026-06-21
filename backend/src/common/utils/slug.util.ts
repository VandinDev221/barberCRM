import { PrismaService } from '../prisma/prisma.service';

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'agendar',
  'auth',
  'billing',
  'dashboard',
  'forgot-password',
  'reset-password',
  'login',
  'register',
  'onboarding',
  'public',
  'settings',
  'termos',
  'privacidade',
]);

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function slugToDisplayName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeSlugInput(raw: string): string {
  return slugify(raw.trim());
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

export async function isSlugAvailable(
  prisma: PrismaService,
  slug: string,
  excludeUserId?: string,
): Promise<boolean> {
  if (!slug || slug.length < 3) return false;
  if (isReservedSlug(slug)) return false;
  const existing = await prisma.user.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return true;
  return excludeUserId ? existing.id === excludeUserId : false;
}

export async function generateUniqueSlug(
  prisma: PrismaService,
  name: string,
  email: string,
): Promise<string> {
  const base = slugify(name) || slugify(email.split('@')[0]) || 'barbeiro';
  let candidate = base;
  let suffix = 0;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
