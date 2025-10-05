/**
 * Утилита для работы с API
 * 
 * Настройка Axios клиента для взаимодействия с backend API:
 * - Базовый URL из переменных окружения
 * - Автоматическое добавление токенов авторизации
 * - Обработка ошибок авторизации
 * - Интерцепторы для запросов и ответов
 */

import axios from 'axios';

// URL API сервера (из переменных окружения или localhost по умолчанию)
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

// Отладочная информация
console.log('API_URL:', API_URL);
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('window.location.origin:', typeof window !== 'undefined' ? window.location.origin : 'undefined');

// Создание экземпляра Axios с базовой конфигурацией
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Интерцептор запросов - автоматически добавляет токены авторизации
 * Приоритет: adminToken > token
 */
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    
    // Получаем токены из localStorage
    const token = localStorage.getItem('token');           // Токен обычного пользователя
    const adminToken = localStorage.getItem('adminToken'); // Токен администратора
    
    // Добавляем токен в заголовки (приоритет у админ токена)
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      console.log('Using admin token');
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Using user token');
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Интерцептор ответов - обрабатывает ошибки авторизации
 * При 401 ошибке очищает токены и перенаправляет на главную
 */
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data, error.config?.url);
    
    // Если получили 401 (Unauthorized) - токен недействителен
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - clearing tokens');
      // Очищаем токены из localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
      // Перенаправляем на главную страницу
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
