import { PrismaService } from '../prisma/prisma.service';

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
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
