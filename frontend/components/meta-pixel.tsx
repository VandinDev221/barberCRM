'use client';

import Script from 'next/script';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function initMetaPixel() {
  if (!PIXEL_ID || typeof window.fbq !== 'function') return;
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
}

export function MetaPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel-queue" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
          n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        `}
      </Script>
      <Script
        id="meta-pixel-sdk"
        strategy="afterInteractive"
        src="https://connect.facebook.net/en_US/fbevents.js"
        onLoad={initMetaPixel}
      />
    </>
  );
}
