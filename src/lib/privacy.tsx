'use client';

import { createContext, useContext, useState, useCallback, useSyncExternalStore } from 'react';

interface PrivacyContextValue {
  isPrivacyMode: boolean;
  togglePrivacy: () => void;
  formatCurrency: (value: number) => string;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

const PRIVACY_MASK = '$•••••';

function getPrivacyFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('privacyMode') === 'true';
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

const realFormatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const initialPrivacy = useSyncExternalStore(
    subscribe,
    getPrivacyFromStorage,
    () => false
  );
  const [isPrivacyMode, setIsPrivacyMode] = useState(initialPrivacy);

  const togglePrivacy = useCallback(() => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      localStorage.setItem('privacyMode', String(next));
      return next;
    });
  }, []);

  const formatCurrency = useCallback(
    (value: number) => {
      if (isPrivacyMode) return PRIVACY_MASK;
      return realFormatCurrency(value);
    },
    [isPrivacyMode]
  );

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacy, formatCurrency }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
