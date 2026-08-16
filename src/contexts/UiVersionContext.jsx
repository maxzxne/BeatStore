import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'beatstore-ui-version';
const VERSIONS = ['v1', 'v2', 'v3'];
const UiVersionContext = createContext(null);

const readInitialVersion = () => {
  if (typeof window === 'undefined') return 'v1';
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('ui');
  if (VERSIONS.includes(fromQuery)) return fromQuery;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (VERSIONS.includes(saved)) return saved;
  const envDefault = import.meta.env.VITE_UI_VERSION;
  if (VERSIONS.includes(envDefault)) return envDefault;
  return 'v1';
};

export const UiVersionProvider = ({ children }) => {
  const [version, setVersionState] = useState(readInitialVersion);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('ui-v2', version === 'v2');
    root.classList.toggle('ui-v3', version === 'v3');
    localStorage.setItem(STORAGE_KEY, version);
    if (version === 'v2' || version === 'v3') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [version]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('ui');
    if (VERSIONS.includes(fromQuery)) {
      setVersionState(fromQuery);
    }
  }, []);

  const setVersion = (next) => {
    if (!VERSIONS.includes(next)) return;
    setVersionState(next);
    const url = new URL(window.location.href);
    url.searchParams.set('ui', next);
    window.history.replaceState({}, '', url);
  };

  const value = useMemo(() => ({
    version,
    isV2: version === 'v2',
    isV3: version === 'v3',
    setVersion,
    toggleVersion: () => setVersion(version === 'v3' ? 'v2' : version === 'v2' ? 'v1' : 'v3'),
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
