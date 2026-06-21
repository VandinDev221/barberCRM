'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { apiPost, apiGet } from '@/lib/api';
import { AuthResponse, persistAuthSession } from '@/lib/auth-session';

type GoogleCredentialResponse = {
  credential?: string;
};

type AuthConfig = {
  googleClientId: string | null;
};

type Props = {
  acceptTerms?: boolean;
  onSuccess: (res: AuthResponse) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  showDivider?: boolean;
};

/** Evita chamar google.accounts.id.initialize() mais de uma vez (React Strict Mode / re-renders). */
let gsiInitializedClientId: string | null = null;

export function GoogleSignInButton({
  acceptTerms,
  onSuccess,
  onError,
  disabled,
  showDivider = true,
}: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [clientId, setClientId] = useState<string | null>(envClientId || null);
  const [configLoading, setConfigLoading] = useState(!envClientId);
  const [scriptReady, setScriptReady] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const acceptTermsRef = useRef(acceptTerms);

  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  acceptTermsRef.current = acceptTerms;

  const credentialHandlerRef = useRef<(response: GoogleCredentialResponse) => void>(() => {});

  credentialHandlerRef.current = async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      onErrorRef.current('Não foi possível obter credencial do Google.');
      return;
    }
    try {
      const res = await apiPost<AuthResponse>('/auth/google', {
        idToken: response.credential,
        ...(acceptTermsRef.current ? { acceptTerms: true } : {}),
      });
      persistAuthSession(res);
      onSuccessRef.current(res);
    } catch (err: unknown) {
      onErrorRef.current(err instanceof Error ? err.message : 'Erro ao entrar com Google');
    }
  };

  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (envClientId) return;

    apiGet<AuthConfig>('/public/auth-config')
      .then((data) => setClientId(data.googleClientId))
      .catch(() => setClientId(null))
      .finally(() => setConfigLoading(false));
  }, [envClientId]);

  useEffect(() => {
    if (!scriptReady || !clientId || !buttonRef.current) return;

    const google = window.google;
    if (!google?.accounts?.id) return;

    if (gsiInitializedClientId !== clientId) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => credentialHandlerRef.current(response),
      });
      gsiInitializedClientId = clientId;
    }

    buttonRef.current.innerHTML = '';
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
  }, [scriptReady, clientId]);

  if (configLoading || !clientId) return null;

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
      {showDivider && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou e-mail</span>
          </div>
        </div>
      )}
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
