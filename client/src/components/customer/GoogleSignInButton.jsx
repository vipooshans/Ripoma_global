import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

let gisScriptPromise = null;

const loadGisScript = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gis="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });

  return gisScriptPromise;
};

/**
 * Renders Google Identity Services button and returns the ID token via onCredential.
 */
const GoogleSignInButton = ({ onCredential, disabled = false, text = 'continue_with' }) => {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured.');
      return undefined;
    }

    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              onCredentialRef.current?.(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text,
          logo_alignment: 'left',
          width: Math.min(buttonRef.current.offsetWidth || 320, 400)
        });

        setReady(true);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Could not load Google Sign-In.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="w-full">
      <div
        ref={buttonRef}
        className={`flex justify-center min-h-[44px] ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        aria-busy={!ready && !error}
      />
      {error && (
        <p className="text-xs text-rose-500 text-center mt-2 font-semibold">{error}</p>
      )}
    </div>
  );
};

export default GoogleSignInButton;
