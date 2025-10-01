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
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
    // Получаем токены из localStorage
    const token = localStorage.getItem('token');           // Токен обычного пользователя
    const adminToken = localStorage.getItem('adminToken'); // Токен администратора
    
    // Добавляем токен в заголовки (приоритет у админ токена)
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Интерцептор ответов - обрабатывает ошибки авторизации
 * При 401 ошибке очищает токены и перенаправляет на главную
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Если получили 401 (Unauthorized) - токен недействителен
    if (error.response?.status === 401) {
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
