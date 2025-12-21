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
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, ShoppingCart, Heart, LogOut, Music, Music2, ShoppingBag, GraduationCap, Settings, Menu, X } from 'lucide-react';
import { api } from '../utils/api';

/**
 * Компонент шапки сайта
 * @param {Object} props - Свойства компонента
 * @param {boolean} props.admin - Режим административной панели
 * @returns {JSX.Element} JSX элемент шапки
 */
const Header = ({ admin = false }) => {
  // Контекст аутентификации
  const { user, adminUser, logout, isAuthenticated, isAdminAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Состояние счетчиков
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  // Состояние мобильного меню
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavoritesCount();
      fetchCartCount();
    }
  }, [isAuthenticated]);

  // Обновляем счетчики при изменении маршрута
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavoritesCount();
      fetchCartCount();
    }
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
      <header className="bg-white border-b border-gray-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-black">XWinner.beats.please Админ</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="btn btn-outline btn-sm"
            >
              На сайт
            </Link>
            <span className="text-gray-600">Добро пожаловать, {adminUser?.username}</span>
            <button
              onClick={handleLogout}
              className="btn btn-outline btn-sm"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-gray-300 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-xl sm:text-2xl font-bold text-black" onClick={() => setMobileMenuOpen(false)}>
            XWinner.beats.please
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4">
            {/* Основные разделы */}
            <Link
              to="/"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/' ? 'text-black border-b-2 border-black' : 'text-gray-600 hover:text-black'
              }`}
            >
              Каталог
            </Link>
            <Link
              to="/courses"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/courses' ? 'text-black border-b-2 border-black' : 'text-gray-600 hover:text-black'
              }`}
            >
              Обучение
            </Link>
            <Link
              to="/order"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/order' ? 'text-black border-b-2 border-black' : 'text-gray-600 hover:text-black'
              }`}
            >
              Заказ
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link
                  to="/favorites"
                  className="p-2 text-gray-600 hover:text-black transition-colors relative"
                  title="Избранное"
                >
                  <Heart className="h-5 w-5" fill={favoritesCount > 0 ? 'currentColor' : 'none'} />
                  {favoritesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {favoritesCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/cart"
                  className="p-2 text-gray-600 hover:text-black transition-colors relative"
                  title="Корзина"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/purchases"
                  className="p-2 text-gray-600 hover:text-black transition-colors"
                  title="Покупки"
                >
                  <Music className="h-5 w-5" />
                </Link>
                <Link
                  to="/profile"
                  className="p-2 text-gray-600 hover:text-black transition-colors"
                  title="Профиль"
                >
                  <User className="h-5 w-5" />
                </Link>
                {/* Кнопка админки для админов */}
                {(user?.is_admin || isAdminAuthenticated) && (
                  <Link
                    to="/admin"
                    className="btn btn-primary btn-sm flex items-center gap-2"
                    title="Админ-панель"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden xl:inline">Админка</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="btn btn-outline btn-sm"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline btn-sm">
                  Войти
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Регистрация
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:text-black transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <div className="flex flex-col space-y-3">
              {/* Основные разделы */}
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 text-base font-medium transition-colors ${
                  location.pathname === '/' ? 'text-black border-l-4 border-black' : 'text-gray-600'
                }`}
              >
                Каталог
              </Link>
              <Link
                to="/courses"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 text-base font-medium transition-colors ${
                  location.pathname === '/courses' ? 'text-black border-l-4 border-black' : 'text-gray-600'
                }`}
              >
                Обучение
              </Link>
              <Link
                to="/order"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 text-base font-medium transition-colors ${
                  location.pathname === '/order' ? 'text-black border-l-4 border-black' : 'text-gray-600'
                }`}
              >
                Заказ
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link
                    to="/favorites"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-base font-medium text-gray-600 flex items-center gap-2"
                  >
                    <Heart className="h-5 w-5" fill={favoritesCount > 0 ? 'currentColor' : 'none'} />
                    Избранное {favoritesCount > 0 && `(${favoritesCount})`}
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-base font-medium text-gray-600 flex items-center gap-2"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Корзина {cartCount > 0 && `(${cartCount})`}
                  </Link>
                  <Link
                    to="/purchases"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-base font-medium text-gray-600 flex items-center gap-2"
                  >
                    <Music className="h-5 w-5" />
                    Покупки
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-base font-medium text-gray-600 flex items-center gap-2"
                  >
                    <User className="h-5 w-5" />
                    Профиль
                  </Link>
                  {/* Кнопка админки для админов */}
                  {(user?.is_admin || isAdminAuthenticated) && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn btn-primary btn-sm flex items-center gap-2 w-full justify-center"
                    >
                      <Settings className="h-4 w-4" />
                      Админка
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="btn btn-outline btn-sm w-full"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-outline btn-sm w-full text-center">
                    Войти
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary btn-sm w-full text-center">
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
