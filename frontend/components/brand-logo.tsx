import Image from 'next/image';
import { cn } from '@/lib/utils';

const LOGO_SRC = '/logo-barber-crm.png';
const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 512;

type BrandLogoProps = {
  variant?: 'header' | 'auth' | 'compact';
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ variant = 'header', className, priority }: BrandLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Barber CRM"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={cn(
        variant === 'header' && 'h-9 w-auto sm:h-10',
        variant === 'auth' && 'mx-auto h-auto w-full max-w-[340px]',
        variant === 'compact' && 'h-8 w-auto',
        className,
      )}
    />
  );
}
