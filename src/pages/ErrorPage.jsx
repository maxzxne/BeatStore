import React from 'react';
import { useRouteError, Link } from 'react-router-dom';
import { Home, RefreshCw, AlertTriangle, FileX, Wifi, Server } from 'lucide-react';

const ErrorPage = () => {
  const error = useRouteError();
  
  const getErrorInfo = () => {
    if (error?.status === 404) {
      return {
        icon: FileX,
        title: 'Страница не найдена',
        message: 'К сожалению, запрашиваемая страница не существует.',
        suggestion: 'Проверьте правильность URL или вернитесь на главную страницу.'
      };
    }
    
    if (error?.status === 500) {
      return {
        icon: Server,
        title: 'Ошибка сервера',
        message: 'Произошла внутренняя ошибка сервера.',
        suggestion: 'Попробуйте обновить страницу или вернитесь позже.'
      };
    }
    
    if (error?.message?.includes('Network Error') || error?.message?.includes('fetch')) {
      return {
        icon: Wifi,
        title: 'Проблемы с подключением',
        message: 'Не удается подключиться к серверу.',
        suggestion: 'Проверьте интернет-соединение и попробуйте снова.'
      };
    }
    
    return {
      icon: AlertTriangle,
      title: 'Произошла ошибка',
      message: 'Что-то пошло не так. Мы уже работаем над исправлением.',
      suggestion: 'Попробуйте обновить страницу или вернитесь на главную.'
    };
  };

  const errorInfo = getErrorInfo();
  const Icon = errorInfo.icon;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
            <Icon className="w-12 h-12 text-red-500" />
          </div>
        </div>

        {/* Error Content */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {errorInfo.title}
          </h1>
          <p className="text-gray-600 mb-4">
            {errorInfo.message}
          </p>
          <p className="text-sm text-gray-500">
            {errorInfo.suggestion}
          </p>
        </div>

        {/* Error Details (for development) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-8 p-4 bg-gray-100 rounded-lg text-left">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Детали ошибки:</h3>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            На главную
          </Link>
          
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Обновить страницу
          </button>
        </div>

        {/* Additional Help */}
        <div className="mt-8 text-sm text-gray-500">
          <p>
            Если проблема повторяется,{' '}
            <a 
              href="mailto:support@beatstore.com" 
              className="text-black hover:underline"
            >
              свяжитесь с поддержкой
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
