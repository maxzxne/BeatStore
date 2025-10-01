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
import { User, ShoppingCart, Heart, LogOut, Music } from 'lucide-react';
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
            <h1 className="text-xl font-bold text-black">BeatStore Админ</h1>
          </div>
          
          <div className="flex items-center space-x-4">
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
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-black">
            BeatStore
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
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
        </div>
      </div>
    </header>
  );
};

export default Header;
