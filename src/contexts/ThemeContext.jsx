import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // По умолчанию тёмная тема
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    // Если нет сохранённой темы или сохранена 'dark' - тёмная тема
    return saved !== 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode || root.classList.contains('ui-v2')) {
      root.classList.add('dark');
      if (!root.classList.contains('ui-v2')) {
        localStorage.setItem('theme', 'dark');
      }
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const setLightMode = () => setIsDarkMode(false);
  const setDarkMode = () => setIsDarkMode(true);

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      toggleTheme, 
      setLightMode, 
      setDarkMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

