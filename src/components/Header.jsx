/**
 * Компонент шапки сайта
 * 
 * Отображает навигацию, логотип и информацию о пользователе.
 * Поддерживает два режима:
 * - Обычный режим: для пользователей с навигацией по сайту
 * - Админ режим: для административной панели
 * 
 * Функциональность:
 * - Отображение счетчиков избранного и корзины
 * - Кнопки входа/выхода
 * - Навигация по разделам сайта
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, ShoppingCart, Heart, Music, Settings } from 'lucide-react';
import { api } from '../utils/api';

/**
 * Компонент шапки сайта
 * @param {Object} props - Свойства компонента
 * @param {boolean} props.admin - Режим административной панели
 * @returns {JSX.Element} JSX элемент шапки
 */
const Header = ({ admin = false }) => {
  // Контекст аутентификации
  const { user, adminUser, isAuthenticated, isAdminAuthenticated } = useAuth();
  const location = useLocation();
  
  // Состояние счетчиков
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  // Состояние мобильного меню
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavoritesCount();
      fetchCartCount();
    }
  }, [isAuthenticated]);

  // Обновляем счетчики при изменении маршрута и по глобальным событиям
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavoritesCount();
      fetchCartCount();
    }

    const handleFavoritesUpdated = () => {
      if (isAuthenticated) {
        fetchFavoritesCount();
      }
    };

    const handleCartUpdated = () => {
      if (isAuthenticated) {
        fetchCartCount();
      }
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
      const response = await api.get('/favorites');
      setFavoritesCount(response.data.length);
    } catch (error) {
      console.error('Error fetching favorites count:', error);
    }
  };

  const fetchCartCount = async () => {
    try {
      const response = await api.get('/cart');
      setCartCount(response.data.length);
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

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
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Desktop Navigation (left side) */}
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
            <Link to="/" className="text-base sm:text-xl lg:text-2xl font-bold text-black dark:text-white truncate" onClick={() => setMobileMenuOpen(false)}>
              XWinner.beats.please
            </Link>

            {/* Desktop Navigation - moved to left */}
            <nav className="hidden lg:flex items-center space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === '/' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Биты
              </Link>
              <Link
                to="/courses"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === '/courses' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Обучение
              </Link>
              <Link
                to="/order"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === '/order' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Услуги
              </Link>
            </nav>
          </div>

          {/* Right side - icons and auth */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Desktop - icons and buttons */}
            <div className="hidden lg:flex items-center space-x-2">
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
                  {/* Иконка админки для админов (как у остальных иконок) */}
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
                <Link to="/login" className="text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors font-medium">
                  Войти
                </Link>
              )}
            </div>

            {/* Mobile - icons and auth button */}
            <div className="lg:hidden flex items-center space-x-0.5 sm:space-x-1">
              {/* Mobile Icons (if authenticated) */}
              {isAuthenticated && (
                <>
                  <Link
                    to="/favorites"
                    className="p-1.5 sm:p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors relative"
                    title="Избранное"
                  >
                    <Heart className="h-4 w-4 sm:h-5 sm:w-5" fill={favoritesCount > 0 ? 'currentColor' : 'none'} />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                        {favoritesCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/cart"
                    className="p-1.5 sm:p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors relative"
                    title="Корзина"
                  >
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-white dark:bg-black text-black dark:text-white text-[10px] rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center border border-gray-300 dark:border-neutral-700">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/purchases"
                    className="p-1.5 sm:p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                    title="Покупки"
                  >
                    <Music className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                  {/* Кнопка админки для админов */}
                  {(user?.is_admin || isAdminAuthenticated) && (
                    <Link
                      to="/admin"
                      className="p-1.5 sm:p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                      title="Админ-панель"
                    >
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Link>
                  )}
                </>
              )}

              {/* Mobile Auth Button */}
              {isAuthenticated ? (
                <Link
                  to="/profile"
                  className="p-1.5 sm:p-2 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                  title="Профиль"
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              ) : (
                <Link to="/login" className="text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors font-medium text-xs sm:text-sm px-1 sm:px-2">
                  Войти
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation - под шапкой, всегда видимо */}
        <nav className="lg:hidden mt-2 pt-2 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-center space-x-2 sm:space-x-4">
          <Link
            to="/"
            className={`px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium transition-colors ${
              location.pathname === '/' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Биты
          </Link>
          <Link
            to="/courses"
            className={`px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium transition-colors ${
              location.pathname === '/courses' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Обучение
          </Link>
          <Link
            to="/order"
            className={`px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium transition-colors ${
              location.pathname === '/order' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Услуги
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;

