import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'beatstore-ui-version';
const UiVersionContext = createContext(null);

const readInitialVersion = () => {
  if (typeof window === 'undefined') return 'v1';
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('ui');
  if (fromQuery === 'v1' || fromQuery === 'v2') return fromQuery;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'v1' || saved === 'v2') return saved;
  const envDefault = import.meta.env.VITE_UI_VERSION;
  return envDefault === 'v2' ? 'v2' : 'v1';
};

export const UiVersionProvider = ({ children }) => {
  const [version, setVersionState] = useState(readInitialVersion);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('ui-v2', version === 'v2');
    localStorage.setItem(STORAGE_KEY, version);
    if (version === 'v2') {
      root.classList.add('dark');
    }
  }, [version]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('ui');
    if (fromQuery === 'v1' || fromQuery === 'v2') {
      setVersionState(fromQuery);
    }
  }, []);

  const setVersion = (next) => {
    if (next !== 'v1' && next !== 'v2') return;
    setVersionState(next);
    const url = new URL(window.location.href);
    url.searchParams.set('ui', next);
    window.history.replaceState({}, '', url);
  };

  const value = useMemo(() => ({
    version,
    isV2: version === 'v2',
    setVersion,
    toggleVersion: () => setVersion(version === 'v2' ? 'v1' : 'v2'),
  }), [version]);

  return (
    <UiVersionContext.Provider value={value}>
      {children}
    </UiVersionContext.Provider>
  );
};

export const useUiVersion = () => {
  const ctx = useContext(UiVersionContext);
  if (!ctx) throw new Error('useUiVersion must be used within UiVersionProvider');
  return ctx;
};
