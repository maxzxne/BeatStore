import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/** V2 ships dark-only — no light toggle. */
export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark', 'ui-v2');
    root.classList.remove('ui-v3');
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode: true,
        toggleTheme: () => {},
        setLightMode: () => {},
        setDarkMode: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
