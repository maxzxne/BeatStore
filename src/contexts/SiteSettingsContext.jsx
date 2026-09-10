import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const SiteSettingsContext = createContext();

export const DEFAULT_HOME_HERO = {
  enabled: true,
  eyebrow: 'XWinner',
  title: 'Инструменталы.\nЧёрный экран.\nЗелёный удар.',
  subtitle: 'Каталог битов, заказы под ключ и курсы по битмейкингу. Слушай демо, бери лицензию, работай дальше.',
  image_url: null,
  cta_label: null,
  cta_href: null,
};

function normalizeHomeHero(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_HOME_HERO };
  }
  return {
    ...DEFAULT_HOME_HERO,
    ...raw,
    enabled: raw.enabled !== false,
    eyebrow: raw.eyebrow ?? DEFAULT_HOME_HERO.eyebrow,
    title: raw.title ?? DEFAULT_HOME_HERO.title,
    subtitle: raw.subtitle ?? DEFAULT_HOME_HERO.subtitle,
    image_url: raw.image_url || null,
    cta_label: raw.cta_label || null,
    cta_href: raw.cta_href || null,
  };
}

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
};

/**
 * courses_visibility:
 * - all — вкладка «Обучение» видна всем
 * - admins_only — только администраторам
 * - hidden — скрыта для всех (включая админов на публичном сайте)
 */
export const SiteSettingsProvider = ({ children }) => {
  const { user, isAdminAuthenticated } = useAuth();
  const [coursesVisibility, setCoursesVisibility] = useState('all');
  const [homeHero, setHomeHero] = useState(() => ({ ...DEFAULT_HOME_HERO }));
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/site-settings');
      const value = response.data?.courses_visibility;
      if (value === 'all' || value === 'admins_only' || value === 'hidden') {
        setCoursesVisibility(value);
      } else {
        setCoursesVisibility('all');
      }
      setHomeHero(normalizeHomeHero(response.data?.home_hero));
    } catch (error) {
      console.error('Error fetching site settings:', error);
      setCoursesVisibility('all');
      setHomeHero({ ...DEFAULT_HOME_HERO });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const handleUpdated = () => {
      fetchSettings();
    };
    window.addEventListener('siteSettingsUpdated', handleUpdated);
    return () => window.removeEventListener('siteSettingsUpdated', handleUpdated);
  }, [fetchSettings]);

  const isAdmin = Boolean(user?.is_admin || isAdminAuthenticated);

  // Публичная навигация / страницы каталога
  const canSeeCourses = coursesVisibility === 'all'
    || (coursesVisibility === 'admins_only' && isAdmin);

  const value = {
    coursesVisibility,
    setCoursesVisibility,
    canSeeCourses,
    homeHero,
    loading,
    refreshSiteSettings: fetchSettings,
  };

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
};
