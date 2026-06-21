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
        variant === 'header' && 'h-12 w-auto sm:h-14',
        variant === 'auth' && 'mx-auto h-auto w-full max-w-[420px] sm:max-w-[440px]',
        variant === 'compact' && 'h-10 w-auto sm:h-11',
        className,
      )}
    />
  );
}
