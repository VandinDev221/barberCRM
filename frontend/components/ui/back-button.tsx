'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from './button';

type BackButtonProps = {
  href: string;
  label: string;
  className?: string;
};

export function BackButton({ href, label, className }: BackButtonProps) {
  return (
    <Button variant="ghost" size="sm" asChild className={className}>
      <Link href={href} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
