/**
 * Контекст аутентификации для управления пользователями и администраторами
 * 
 * Обеспечивает:
 * - Регистрацию и авторизацию обычных пользователей
 * - Авторизацию администраторов
 * - Управление токенами доступа
 * - Проверку прав доступа
 * - Автоматическое восстановление сессии
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

// Создание контекста для аутентификации
const AuthContext = createContext();

/**
 * Хук для использования контекста аутентификации
 * @returns {Object} Объект с функциями и состоянием аутентификации
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Провайдер контекста аутентификации
 * @param {Object} props - Свойства компонента
 * @param {React.ReactNode} props.children - Дочерние компоненты
 */
export const AuthProvider = ({ children }) => {
  // Состояние текущего пользователя
  const [user, setUser] = useState(null);
  // Состояние администратора
  const [adminUser, setAdminUser] = useState(null);
  // Состояние загрузки (проверка токенов при инициализации)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    
    if (token) {
      fetchUser();
    } else if (adminToken) {
      fetchAdminUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/me');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUser = async () => {
    try {
      const response = await api.get('/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (response.data.is_admin) {
        setAdminUser(response.data);
      } else {
        localStorage.removeItem('adminToken');
        setAdminUser(null);
      }
    } catch (error) {
      localStorage.removeItem('adminToken');
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/login', { username, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      await fetchUser();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const adminLogin = async (username, password) => {
    try {
      console.log('Attempting admin login:', { username });
      const response = await api.post('/api/admin/login', { username, password });
      console.log('Admin login successful:', response.data);
      const { access_token } = response.data;
      localStorage.setItem('adminToken', access_token);
      localStorage.removeItem('token'); // Удаляем обычный токен
      setUser(null); // Сбрасываем обычного пользователя
      await fetchAdminUser();
      return { success: true };
    } catch (error) {
      console.error('Admin login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Admin login failed' 
      };
    }
  };

  const register = async (email, username, password) => {
    try {
      console.log('Attempting registration:', { email, username });
      const response = await api.post('/register', { email, username, password });
      console.log('Registration successful:', response.data);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const loginWithTelegram = async (telegramAuthData) => {
    console.log('========================================');
    console.log('🔐 loginWithTelegram: НАЧАЛО');
    console.log('loginWithTelegram: входные данные =', telegramAuthData);
    console.log('========================================');
    
    try {
      // Используем существующий OAuth endpoint для Telegram
      const telegramData = {
        provider: 'telegram',
        provider_user_id: telegramAuthData.id?.toString() || telegramAuthData.id,
        access_token: telegramAuthData.hash || 'telegram_webapp', // Telegram Web App использует hash
        username: telegramAuthData.username || null,
        first_name: telegramAuthData.first_name || null,
        last_name: telegramAuthData.last_name || null,
        email: null, // Telegram не предоставляет email
        photo_url: telegramAuthData.photo_url || null
      };
      
      console.log('loginWithTelegram: отправляем данные на сервер:', telegramData);
      console.log('loginWithTelegram: URL = /oauth/login');
      
      const response = await api.post('/oauth/login', telegramData);
      console.log('loginWithTelegram: ответ сервера получен:', response.data);
      
      const { access_token } = response.data;
      console.log('loginWithTelegram: access_token получен:', access_token ? 'ЕСТЬ' : 'НЕТ');
      
      localStorage.setItem('token', access_token);
      console.log('loginWithTelegram: токен сохранен в localStorage');
      
      console.log('loginWithTelegram: получаем данные пользователя...');
      await fetchUser();
      console.log('loginWithTelegram: данные пользователя получены');
      
      console.log('✅ loginWithTelegram: УСПЕХ');
      console.log('========================================');
      return { success: true };
    } catch (error) {
      console.error('========================================');
      console.error('❌ loginWithTelegram: ОШИБКА');
      console.error('loginWithTelegram: error =', error);
      console.error('loginWithTelegram: error.message =', error.message);
      console.error('loginWithTelegram: error.response =', error.response);
      console.error('loginWithTelegram: error.response?.data =', error.response?.data);
      console.error('loginWithTelegram: error.response?.status =', error.response?.status);
      console.error('loginWithTelegram: error.stack =', error.stack);
      console.error('========================================');
      
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Telegram login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    setUser(null);
    setAdminUser(null);
  };

  const value = {
    user,
    adminUser,
    loading,
    login,
    adminLogin,
    register,
    loginWithTelegram,
    logout,
    fetchUser,
    isAuthenticated: !!user,
    isAdminAuthenticated: !!adminUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
