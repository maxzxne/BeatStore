import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Mail, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthSettings, setOauthSettings] = useState({});
  const [oauthSettingsLoading, setOauthSettingsLoading] = useState(true);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Загружаем настройки OAuth
    const fetchOAuthSettings = async (withLoading = false) => {
      try {
        if (withLoading) {
          setOauthSettingsLoading(true);
        }
        const response = await api.get('/oauth-settings');
        // Backend возвращает объект напрямую: {provider: {is_hidden, is_disabled}}
        const settingsObj = response.data || {};
        setOauthSettings(settingsObj);
      } catch (error) {
        console.error('Error fetching OAuth settings:', error);
        // В случае ошибки скрываем все кнопки (кроме Telegram, который должен работать)
        setOauthSettings({
          google: { is_hidden: true, is_disabled: false },
          vk: { is_hidden: true, is_disabled: false },
          yandex: { is_hidden: true, is_disabled: false },
          telegram: { is_hidden: false, is_disabled: false } // Telegram всегда доступен
        });
      } finally {
        if (withLoading) {
          setOauthSettingsLoading(false);
        }
      }
    };

    // Первичная загрузка с индикатором
    fetchOAuthSettings(true);
    
    // Обновляем настройки каждые 5 секунд и при фокусе окна (без скрытия блока)
    const interval = setInterval(() => fetchOAuthSettings(false), 5000);
    const handleFocus = () => fetchOAuthSettings(false);
    window.addEventListener('focus', handleFocus);
    
    // Слушаем событие обновления настроек из админки
    const handleSettingsUpdate = () => {
      console.log('OAuth settings update event received');
      fetchOAuthSettings(false);
    };
    window.addEventListener('oauthSettingsUpdated', handleSettingsUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('oauthSettingsUpdated', handleSettingsUpdate);
    };
  }, []);
  
  // Автоматическая авторизация при возврате из Telegram
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramAuth = urlParams.get('telegram_auth');
    const chatId = urlParams.get('chat_id');
    const username = urlParams.get('username');
    
    if (telegramAuth === '1' && chatId) {
      // Автоматически авторизуем пользователя через Telegram
      const authorizeUser = async () => {
        try {
          setLoading(true);
          setError('');
          
          // Получаем данные пользователя из Telegram через API
          const formData = new FormData();
          formData.append('chat_id', chatId);
          if (username) formData.append('username', username);
          const first_name = urlParams.get('first_name');
          const last_name = urlParams.get('last_name');
          if (first_name) formData.append('first_name', first_name);
          if (last_name) formData.append('last_name', last_name);
          
          const response = await api.post('/oauth/telegram-auth', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            // Убираем параметры из URL
            window.history.replaceState({}, '', '/register');
            navigate('/');
          } else {
            setError('Не удалось авторизоваться через Telegram');
          }
        } catch (err) {
          console.error('Telegram auth error:', err);
          setError('Ошибка авторизации через Telegram');
          // Убираем параметры из URL
          window.history.replaceState({}, '', '/register');
        } finally {
          setLoading(false);
        }
      };
      
      authorizeUser();
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    const result = await register(formData.email, formData.username, formData.password);
    
    if (result.success) {
      navigate('/login');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setError('');
    
    try {
      if (provider === 'telegram') {
        // Telegram использует виджет, который нужно встроить на страницу
        setError('Telegram авторизация доступна через виджет. Пожалуйста, используйте кнопку Telegram ниже.');
        setLoading(false);
        return;
      }
      
      // Для других провайдеров перенаправляем на OAuth URL
      const { getOAuthUrl } = await import('../utils/oauth');
      const oauthUrl = getOAuthUrl(provider);
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('OAuth error:', error);
      setError(error.message || 'Ошибка OAuth авторизации. Убедитесь, что OAuth приложения настроены.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center transition-colors">
      <div className="max-w-md w-full mx-4">
        <Link to="/" className="inline-flex items-center text-black dark:text-white dark:text-white hover:text-gray-600 dark:text-neutral-400 dark:hover:text-neutral-400 mb-4 transition-colors">
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span className="text-sm">На главную</span>
        </Link>
        <div className="card">
          <div className="card-header text-center">
            <div className="bg-black dark:bg-white rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <User className="h-8 w-8 text-white dark:text-black" />
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white dark:text-white">Регистрация</h1>
            <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Создайте новый аккаунт</p>
          </div>
          
          <form onSubmit={handleSubmit} className="card-content space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="register_email" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-neutral-500 dark:text-neutral-400 z-10 pointer-events-none" />
                <input
                  type="email"
                  id="register_email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Введите email"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="register_username" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
                Имя пользователя
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-neutral-500 dark:text-neutral-400 z-10 pointer-events-none shrink-0" />
                <input
                  type="text"
                  id="register_username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Введите имя пользователя"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="register_password" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-neutral-500 dark:text-neutral-400 z-10 pointer-events-none" />
                <input
                  type="password"
                  id="register_password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Введите пароль"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="register_confirmPassword" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
                Подтвердите пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-neutral-500 dark:text-neutral-400 z-10 pointer-events-none" />
                <input
                  type="password"
                  id="register_confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Подтвердите пароль"
                  required
                />
              </div>
            </div>
            
            <div className="pt-2">
              <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-neutral-700 text-black dark:text-white focus:ring-black dark:focus:ring-white"
                />
                <span>
                  Я подтверждаю, что ознакомился(ась) и принимаю условия{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-black dark:hover:text-white"
                  >
                    Пользовательского соглашения
                  </a>{' '}
                  и{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-black dark:hover:text-white"
                  >
                    Политики конфиденциальности
                  </a>
                  , а также даю согласие на обработку моих персональных данных.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-12 text-base"
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>
          
          {/* OAuth разделитель - показываем только если есть видимые кнопки */}
          {!oauthSettingsLoading && (
            (oauthSettings.google && !oauthSettings.google.is_hidden) ||
            (oauthSettings.vk && !oauthSettings.vk.is_hidden) ||
            (oauthSettings.yandex && !oauthSettings.yandex.is_hidden) ||
            (oauthSettings.telegram && !oauthSettings.telegram.is_hidden)
          ) && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-neutral-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-neutral-900 text-gray-500 dark:text-neutral-500 dark:text-neutral-400">Или зарегистрируйтесь через</span>
              </div>
            </div>
          )}
          
          {/* OAuth кнопки - показываем только после загрузки настроек */}
          {!oauthSettingsLoading && (
            <div className="space-y-3">
            {oauthSettings.google && !oauthSettings.google.is_hidden && (
              <button
                onClick={() => handleOAuthLogin('google')}
                disabled={loading || oauthSettings.google?.is_disabled}
                className="w-full flex items-center justify-center px-4 py-3 h-12 text-base border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:bg-neutral-800 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white dark:text-white"
              >
                <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Регистрация через Google
              </button>
            )}
            
            {oauthSettings.vk && !oauthSettings.vk.is_hidden && (
              <button
                onClick={() => handleOAuthLogin('vk')}
                disabled={loading || oauthSettings.vk?.is_disabled}
                className="w-full flex items-center justify-center px-4 py-3 h-12 text-base border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:bg-neutral-800 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white dark:text-white"
              >
                <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="#0077FF">
                <path d="M12.785 16.241s.287-.032.435-.194c.135-.148.131-.427.131-.427s-.02-1.304.58-1.496c.593-.19 1.35.95 2.153 1.37.607.32 1.067.25 1.067.25l2.141-.03s1.118-.07.587-.95c-.044-.07-.308-.64-1.588-1.81-1.344-1.23-1.163-.516.454-1.58 1.01-.83 1.414-1.336 1.287-1.55-.12-.204-.86-.15-.86-.15l-2.207.014s-.163-.022-.284.05c-.12.07-.196.23-.196.23s-.353.94-.82 1.74c-.99 1.65-1.387 1.74-1.549 1.64-.377-.234-.283-.94-.283-1.44 0-1.565.238-2.216-.465-2.38-.234-.055-.406-.09-1.004-.096-.767-.007-1.41.002-1.777.164-.24.106-.423.344-.31.358.138.018.45.083.614.304.213.285.206.92.206.92s.123 1.82-.287 2.045c-.283.152-.673-.158-1.51-1.58-.428-.89-.752-1.87-.752-1.87s-.062-.15-.172-.23c-.133-.098-.318-.13-.318-.13l-2.09-.02s-.313.01-.428.15c-.102.124-.007.38-.007.38s1.68 3.96 3.58 5.96c1.74 1.84 3.72 1.72 3.72 1.72h.888z"/>
              </svg>
              Регистрация через VK
              </button>
            )}
            
            {oauthSettings.yandex && !oauthSettings.yandex.is_hidden && (
              <button
                onClick={() => handleOAuthLogin('yandex')}
                disabled={loading || oauthSettings.yandex?.is_disabled}
                className="w-full flex items-center justify-center px-4 py-3 h-12 text-base border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:bg-neutral-800 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white dark:text-white"
              >
                <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="255.999" cy="256" r="251.408" fill="#FC3F1D"/>
                  <path d="M313.475,105.366h-45.648c-44.854,0-82.892,34.142-82.892,100.427  c0,39.765,18.42,69.084,51.25,83.547l-61.262,110.869c-2.005,3.619,0,6.426,3.202,6.426h28.433c2.4,0,4.01-0.801,4.81-2.807  l55.659-108.863h20.021v108.863c0,1.197,1.197,2.807,2.799,2.807h24.832c2.4,0,3.203-1.205,3.203-3.205V109.383  C317.881,106.571,316.279,105.366,313.475,105.366z M287.047,269.26h-16.818c-26.427,0-52.053-19.281-52.053-67.483  c0-50.22,24.024-70.705,48.448-70.705h20.424V269.26z" fill="#FFFFFF"/>
                </svg>
              Регистрация через Yandex
              </button>
            )}
            
            {/* Кнопка авторизации через Telegram - всегда видна */}
            {oauthSettings.telegram && !oauthSettings.telegram.is_hidden && (
              <button
                onClick={() => {
                  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'XWinnerbeatpleasebot';
                  // Открываем Telegram бота с параметром для авторизации
                  const telegramUrl = `https://t.me/${botUsername}?start=auth_${Date.now()}`;
                  
                  // Пытаемся открыть в приложении Telegram
                  const tgAppUrl = `tg://resolve?domain=${botUsername}&start=auth_${Date.now()}`;
                  
                  // Пробуем открыть в приложении, если не получится - откроется в браузере
                  window.location.href = tgAppUrl;
                  
                  // Fallback на браузерную версию через небольшую задержку
                  setTimeout(() => {
                    window.open(telegramUrl, '_blank');
                  }, 500);
                  
                  setError('Откройте бота в Telegram для авторизации. После авторизации вернитесь на сайт.');
                }}
                disabled={loading || oauthSettings.telegram?.is_disabled}
                className="w-full flex items-center justify-center px-4 py-3 h-12 text-base border rounded-lg transition-colors bg-[#0088cc] text-white border-[#0088cc] hover:bg-[#0077b5] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.333-.373-.12l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
              </svg>
              Регистрация через Telegram
              </button>
            )}
            </div>
          )}
          
          <div className="card-footer text-center mt-6">
            <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-black dark:text-white dark:text-white hover:underline">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;


