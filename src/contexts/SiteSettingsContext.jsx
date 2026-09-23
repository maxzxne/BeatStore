import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';
import { DEFAULT_ADS_PRICE_PER_DAY, normalizeAdsPricePerDay } from '../utils/adsPricing';
import {
  DEFAULT_SEARCH_PLACEHOLDER,
  normalizeSearchPlaceholder,
} from '../utils/searchPlaceholder';
import {
  DEFAULT_SERVICE_ORDER_PRICING,
  normalizeServiceOrderPricing,
} from '../utils/serviceOrderPricing';

const SiteSettingsContext = createContext();

export const HERO_IMAGE_POSITIONS = ['left', 'right', 'top', 'bottom'];

export const DEFAULT_HOME_HERO = {
  enabled: true,
  eyebrow: 'XWinner',
  title: 'Инструменталы.\nЧёрный экран.\nЗелёный удар.',
  subtitle: 'Каталог битов, заказы под ключ и курсы по битмейкингу. Слушай демо, бери лицензию, работай дальше.',
  image_url: null,
  image_position: 'left',
  cta_label: null,
  cta_href: null,
  show_search: true,
  show_filters: true,
  search_placeholder: DEFAULT_SEARCH_PLACEHOLDER,
};

export function normalizeHeroImagePosition(value) {
  return HERO_IMAGE_POSITIONS.includes(value) ? value : 'left';
}

export { normalizeSearchPlaceholder, DEFAULT_SEARCH_PLACEHOLDER };

function normalizeHomeHero(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_HOME_HERO };
  }
  return {
    ...DEFAULT_HOME_HERO,
    ...raw,
    enabled: raw.enabled !== false,
    // Empty string is intentional (admin cleared the field) — do not revive defaults.
    eyebrow: raw.eyebrow != null ? String(raw.eyebrow) : DEFAULT_HOME_HERO.eyebrow,
    title: raw.title != null ? String(raw.title) : DEFAULT_HOME_HERO.title,
    subtitle: raw.subtitle != null ? String(raw.subtitle) : DEFAULT_HOME_HERO.subtitle,
    image_url: raw.image_url || null,
    image_position: normalizeHeroImagePosition(raw.image_position),
    cta_label: raw.cta_label || null,
    cta_href: raw.cta_href || null,
    show_search: raw.show_search !== false,
    show_filters: raw.show_filters !== false,
    search_placeholder: normalizeSearchPlaceholder(raw.search_placeholder),
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
  const [adsOrdersEnabled, setAdsOrdersEnabled] = useState(true);
  const [promoBannersFullscreen, setPromoBannersFullscreen] = useState(true);
  const [adsPricePerDay, setAdsPricePerDay] = useState(DEFAULT_ADS_PRICE_PER_DAY);
  const [adsSale, setAdsSale] = useState(null);
  const [homeHero, setHomeHero] = useState(() => ({ ...DEFAULT_HOME_HERO }));
  const [serviceOrderPricing, setServiceOrderPricing] = useState(() => ({
    ...DEFAULT_SERVICE_ORDER_PRICING,
  }));
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
      setAdsOrdersEnabled(response.data?.ads_orders_enabled !== false);
      setPromoBannersFullscreen(response.data?.promo_banners_fullscreen !== false);
      setAdsPricePerDay(normalizeAdsPricePerDay(response.data?.ads_price_per_day));
      setAdsSale(response.data?.ads_sale || null);
      setHomeHero(normalizeHomeHero(response.data?.home_hero));
      setServiceOrderPricing(normalizeServiceOrderPricing(response.data?.service_order_pricing));
    } catch (error) {
      console.error('Error fetching site settings:', error);
      setCoursesVisibility('all');
      setAdsOrdersEnabled(true);
      setPromoBannersFullscreen(true);
      setAdsPricePerDay(DEFAULT_ADS_PRICE_PER_DAY);
      setAdsSale(null);
      setHomeHero({ ...DEFAULT_HOME_HERO });
      setServiceOrderPricing(normalizeServiceOrderPricing(null));
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
    adsOrdersEnabled,
    promoBannersFullscreen,
    adsPricePerDay,
    adsSale,
    homeHero,
    serviceOrderPricing,
    loading,
    refreshSiteSettings: fetchSettings,
  };

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
};
