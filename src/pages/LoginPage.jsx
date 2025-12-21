import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock } from 'lucide-react';
import { api } from '../utils/api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
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
            window.history.replaceState({}, '', '/login');
            navigate('/');
          } else {
            setError('Не удалось авторизоваться через Telegram');
          }
        } catch (err) {
          console.error('Telegram auth error:', err);
          setError('Ошибка авторизации через Telegram. Попробуйте использовать виджет ниже.');
          // Убираем параметры из URL
          window.history.replaceState({}, '', '/login');
        } finally {
          setLoading(false);
        }
      };
      
      authorizeUser();
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/');
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
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="card">
          <div className="card-header text-center">
            <div className="bg-black rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-black">Вход</h1>
            <p className="text-gray-600">Войдите в свой аккаунт</p>
          </div>
          
          <form onSubmit={handleSubmit} className="card-content space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="login_username" className="block text-sm font-medium text-black mb-2">
                Имя пользователя
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  id="login_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-10"
                  placeholder="Введите имя пользователя"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="login_password" className="block text-sm font-medium text-black mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="password"
                  id="login_password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Введите пароль"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-12 text-base"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
          
          {/* OAuth разделитель */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Или войдите через</span>
            </div>
          </div>
          
          {/* OAuth кнопки */}
          <div className="space-y-3">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 h-12 text-base border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Войти через Google
            </button>
            
            <button
              onClick={() => handleOAuthLogin('vk')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 h-12 text-base border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#0077FF">
                <path d="M12.785 16.241s.287-.032.435-.194c.135-.148.131-.427.131-.427s-.02-1.304.58-1.496c.593-.19 1.35.95 2.153 1.37.607.32 1.067.25 1.067.25l2.141-.03s1.118-.07.587-.95c-.044-.07-.308-.64-1.588-1.81-1.344-1.23-1.163-.516.454-1.58 1.01-.83 1.414-1.336 1.287-1.55-.12-.204-.86-.15-.86-.15l-2.207.014s-.163-.022-.284.05c-.12.07-.196.23-.196.23s-.353.94-.82 1.74c-.99 1.65-1.387 1.74-1.549 1.64-.377-.234-.283-.94-.283-1.44 0-1.565.238-2.216-.465-2.38-.234-.055-.406-.09-1.004-.096-.767-.007-1.41.002-1.777.164-.24.106-.423.344-.31.358.138.018.45.083.614.304.213.285.206.92.206.92s.123 1.82-.287 2.045c-.283.152-.673-.158-1.51-1.58-.428-.89-.752-1.87-.752-1.87s-.062-.15-.172-.23c-.133-.098-.318-.13-.318-.13l-2.09-.02s-.313.01-.428.15c-.102.124-.007.38-.007.38s1.68 3.96 3.58 5.96c1.74 1.84 3.72 1.72 3.72 1.72h.888z"/>
              </svg>
              Войти через VK
            </button>
            
            <button
              onClick={() => handleOAuthLogin('yandex')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 h-12 text-base border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#FC3F1D">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/>
              </svg>
              Войти через Yandex
            </button>
            
            {/* Кнопка авторизации через Telegram - всегда видна */}
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
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 h-12 text-base border rounded-lg transition-colors bg-[#0088cc] text-white border-[#0088cc] hover:bg-[#0077b5] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.333-.373-.12l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
              </svg>
              Войти через Telegram
            </button>
          </div>
          
          <div className="card-footer text-center mt-6">
            <p className="text-gray-600">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-black hover:underline">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
