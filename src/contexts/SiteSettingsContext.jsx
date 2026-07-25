import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const SiteSettingsContext = createContext();

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
    } catch (error) {
      console.error('Error fetching site settings:', error);
      setCoursesVisibility('all');
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
    loading,
    refreshSiteSettings: fetchSettings,
  };

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
};
