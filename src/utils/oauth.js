/**
 * Утилиты для работы с OAuth авторизацией
 */

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
const FRONTEND_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

/**
 * Получает URL для авторизации через OAuth провайдера
 */
export const getOAuthUrl = (provider) => {
  const redirectUri = `${FRONTEND_URL}/oauth/${provider}/callback`;
  
  switch (provider) {
    case 'google':
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        throw new Error('Google Client ID not configured');
      }
      const googleScope = 'openid email profile';
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(googleScope)}&access_type=online`;
    
    case 'vk':
      const vkClientId = import.meta.env.VITE_VK_CLIENT_ID;
      if (!vkClientId) {
        throw new Error('VK Client ID not configured');
      }
      return `https://oauth.vk.com/authorize?client_id=${vkClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email&display=popup`;
    
    case 'yandex':
      const yandexClientId = import.meta.env.VITE_YANDEX_CLIENT_ID;
      if (!yandexClientId) {
        throw new Error('Yandex Client ID not configured');
      }
      return `https://oauth.yandex.ru/authorize?response_type=code&client_id=${yandexClientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
};

/**
 * Обрабатывает Telegram авторизацию через виджет
 */
export const handleTelegramAuth = async (authData, api) => {
  try {
    // Telegram передает данные через виджет
    const telegramData = {
      provider: 'telegram',
      provider_user_id: authData.id.toString(),
      access_token: authData.hash, // Telegram использует hash для проверки
      username: authData.username || null,
      first_name: authData.first_name || null,
      last_name: authData.last_name || null,
      email: null, // Telegram не предоставляет email по умолчанию
      photo_url: authData.photo_url || null
    };
    
    const response = await api.post('/oauth/login', telegramData);
    return response.data;
  } catch (error) {
    console.error('Telegram auth error:', error);
    throw error;
  }
};

/**
 * Инициализирует Telegram Login Widget
 */
export const initTelegramWidget = (botUsername, callback) => {
  if (typeof window === 'undefined') return;
  
  // Загружаем скрипт Telegram Widget
  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.setAttribute('data-telegram-login', botUsername);
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-onauth', 'onTelegramAuth(user)');
  script.setAttribute('data-request-access', 'write');
  script.async = true;
  
  // Глобальная функция для обработки авторизации
  window.onTelegramAuth = (user) => {
    callback(user);
  };
  
  return script;
};

