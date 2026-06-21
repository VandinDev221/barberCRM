'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { apiPost } from '@/lib/api';
import { AuthResponse, persistAuthSession } from '@/lib/auth-session';

type GoogleCredentialResponse = {
  credential?: string;
};

type Props = {
  acceptTerms?: boolean;
  onSuccess: (res: AuthResponse) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

export function GoogleSignInButton({ acceptTerms, onSuccess, onError, disabled }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [scriptReady, setScriptReady] = useState(false);

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        onError('Não foi possível obter credencial do Google.');
        return;
      }
      try {
        const res = await apiPost<AuthResponse>('/auth/google', {
          idToken: response.credential,
          ...(acceptTerms ? { acceptTerms: true } : {}),
        });
        persistAuthSession(res);
        onSuccess(res);
      } catch (err: unknown) {
        onError(err instanceof Error ? err.message : 'Erro ao entrar com Google');
      }
    },
    [acceptTerms, onError, onSuccess],
  );

  useEffect(() => {
    if (!scriptReady || !clientId || !buttonRef.current || disabled) return;

    const google = window.google;
    if (!google?.accounts?.id) return;

    buttonRef.current.innerHTML = '';
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
    });
    google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 320,
      locale: 'pt-BR',
    });
  }, [scriptReady, clientId, handleCredential, disabled]);

  if (!clientId) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div
        ref={buttonRef}
        className={`flex w-full justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      />
    </>
  );
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
        };
      };
    };
  }
}
