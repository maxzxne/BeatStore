/**
 * Компонент шапки сайта
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { User, ShoppingCart, Heart, Music, Settings } from 'lucide-react';
import { api } from '../utils/api';

const Header = ({ admin = false }) => {
  const { user, adminUser, isAuthenticated, isAdminAuthenticated } = useAuth();
  const { canSeeCourses } = useSiteSettings();
  const location = useLocation();

  const [favoritesCount, setFavoritesCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavoritesCount();
      fetchCartCount();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavoritesCount();
      fetchCartCount();
    }

    const handleFavoritesUpdated = () => {
      if (isAuthenticated) fetchFavoritesCount();
    };
    const handleCartUpdated = () => {
      if (isAuthenticated) fetchCartCount();
    };

    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    window.addEventListener('cartUpdated', handleCartUpdated);
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
      window.removeEventListener('cartUpdated', handleCartUpdated);
    };
  }, [location.pathname, isAuthenticated]);

  const fetchFavoritesCount = async () => {
    try {
      const [beatsRes, coursesRes] = await Promise.all([
        api.get('/favorites'),
        api.get('/course-favorites')
      ]);
      setFavoritesCount((beatsRes.data?.length || 0) + (coursesRes.data?.length || 0));
    } catch (error) {
      console.error('Error fetching favorites count:', error);
    }
  };

  const fetchCartCount = async () => {
    try {
      const [beatsRes, coursesRes] = await Promise.all([
        api.get('/cart'),
        api.get('/course-cart')
      ]);
      setCartCount((beatsRes.data?.length || 0) + (coursesRes.data?.length || 0));
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path) =>
    `relative inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-black dark:text-white'
        : 'text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
    }`;

  const navUnderline = (path) =>
    isActive(path) ? (
      <span className="absolute left-2 right-2 -bottom-0.5 h-0.5 rounded-full bg-black dark:bg-white" />
    ) : null;

  if (admin) {
    return (
      <header className="bg-white dark:bg-neutral-900 border-b border-gray-300 dark:border-neutral-800 px-6 py-4 transition-colors">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-black dark:text-white">XWinner.beats.please Админ</h1>
          <span className="text-gray-600 dark:text-neutral-400 text-sm">Добро пожаловать, {adminUser?.username}</span>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-gray-300 dark:border-neutral-800 sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3 min-h-[40px]">
          <div className="flex items-center min-w-0 gap-4 lg:gap-6">
            <Link
              to="/"
              className="text-base sm:text-xl lg:text-2xl font-bold text-black dark:text-white truncate leading-none py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              XWinner.beats.please
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              <Link to="/" className={navLinkClass('/')}>
                Биты
                {navUnderline('/')}
              </Link>
              {canSeeCourses && (
                <Link to="/courses" className={navLinkClass('/courses')}>
                  Обучение
                  {navUnderline('/courses')}
                </Link>
              )}
              <Link to="/order" className={navLinkClass('/order')}>
                Услуги
                {navUnderline('/order')}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/favorites"
                    className="p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors relative"
                    title="Избранное"
                  >
                    <Heart className="h-5 w-5" fill={favoritesCount > 0 ? 'currentColor' : 'none'} />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-white dark:bg-black text-black dark:text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border border-gray-300 dark:border-neutral-700">
                        {favoritesCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/cart"
                    className="p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors relative"
                    title="Корзина"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-white dark:bg-black text-black dark:text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border border-gray-300 dark:border-neutral-700">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/purchases"
                    className="p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                    title="Покупки"
                  >
                    <Music className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/profile"
                    className="p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                    title="Профиль"
                  >
                    <User className="h-5 w-5" />
                  </Link>
                  {(user?.is_admin || isAdminAuthenticated) && (
                    <Link
                      to="/admin"
                      className="p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                      title="Админ-панель"
                    >
                      <Settings className="h-5 w-5" />
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center leading-none text-sm font-medium text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Войти
                </Link>
              )}
            </div>

            <div className="lg:hidden flex items-center gap-0.5">
              {isAuthenticated && (
                <>
                  <Link
                    to="/favorites"
                    className="inline-flex items-center justify-center w-9 h-9 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors relative"
                    title="Избранное"
                  >
                    <Heart className="h-5 w-5" fill={favoritesCount > 0 ? 'currentColor' : 'none'} />
                    {favoritesCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                        {favoritesCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/cart"
                    className="inline-flex items-center justify-center w-9 h-9 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors relative"
                    title="Корзина"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-white dark:bg-black text-black dark:text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center border border-gray-300 dark:border-neutral-700">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/purchases"
                    className="inline-flex items-center justify-center w-9 h-9 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                    title="Покупки"
                  >
                    <Music className="h-5 w-5" />
                  </Link>
                  {(user?.is_admin || isAdminAuthenticated) && (
                    <Link
                      to="/admin"
                      className="inline-flex items-center justify-center w-9 h-9 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                      title="Админ-панель"
                    >
                      <Settings className="h-5 w-5" />
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="inline-flex items-center justify-center w-9 h-9 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                    title="Профиль"
                  >
                    <User className="h-5 w-5" />
                  </Link>
                </>
              )}

              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center h-9 px-2 text-sm font-medium leading-none text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Войти
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="lg:hidden mt-2 pt-2 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-around">
          <Link to="/" className={`${navLinkClass('/')} flex-1 text-sm`}>
            Биты
            {navUnderline('/')}
          </Link>
          {canSeeCourses && (
            <Link to="/courses" className={`${navLinkClass('/courses')} flex-1 text-sm`}>
              Обучение
              {navUnderline('/courses')}
            </Link>
          )}
          <Link to="/order" className={`${navLinkClass('/order')} flex-1 text-sm`}>
            Услуги
            {navUnderline('/order')}
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
