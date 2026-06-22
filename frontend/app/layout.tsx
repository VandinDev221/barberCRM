import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/layout/app-layout';
import { MetaPixel } from '@/components/meta-pixel';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Barber CRM',
  description: 'CRM e Gestão para Barbeiro Autônomo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <MetaPixel />
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
