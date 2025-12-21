/**
 * Компонент для инициализации Telegram Web App
 * Автоматически определяет, открыто ли приложение в Telegram, и инициализирует его
 */

import { useEffect } from 'react';
import { initTelegramWebApp, getTelegramUser, getTelegramAuthData } from '../utils/telegram';
import { useAuth } from '../contexts/AuthContext';

const TelegramInit = () => {
  const { loginWithTelegram } = useAuth();

  useEffect(() => {
    console.log('========================================');
    console.log('🚀 TelegramInit: НАЧАЛО ИНИЦИАЛИЗАЦИИ');
    console.log('========================================');
    
    // Инициализируем Telegram Web App
    const tg = initTelegramWebApp();
    
    if (!tg) {
      console.log('❌ TelegramInit: не в Telegram Web App, пропускаем');
      return;
    }

    
    // Расширяем приложение на весь экран
    tg.expand();
    
    // Важно: вызываем ready() перед получением данных
    tg.ready();
    
    // Включаем скролл для Telegram Web App
    try {
      // Отключаем блокировку скролла, если она есть
      if (tg.enableClosingConfirmation) {
        tg.enableClosingConfirmation(false);
      }
      // Включаем вертикальную прокрутку
      if (tg.isExpanded !== undefined) {
        // Приложение уже расширено
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    
    
    // Настраиваем полноэкранный режим для десктопа
    if (tg.platform === 'tdesktop' || tg.platform === 'web' || tg.platform === 'unknown') {
      // Для десктопа запрашиваем расширение окна
      try {
        tg.expand();
        console.log('TelegramInit: приложение расширено для десктопа');
      } catch (e) {
        console.log('TelegramInit: не удалось расширить приложение:', e);
      }
    }
    

    // Функция для попытки авторизации
    const attemptAutoLogin = () => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        return true;
      }

      // Прямой доступ к данным пользователя
      const user = tg.initDataUnsafe?.user;
      
      if (!user || !user.id) {
        return false;
      }

      // Формируем данные для авторизации
      const authData = {
        id: String(user.id),
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        username: user.username || null,
        photo_url: user.photo_url || null,
        auth_date: tg.initDataUnsafe?.auth_date || null,
        hash: tg.initDataUnsafe?.hash || null
      };
      
      // Авторизуем пользователя
      loginWithTelegram(authData).then(result => {
        if (result.success) {
          window.location.reload();
        }
      }).catch(error => {
        // Игнорируем ошибки
      });
      
      return true;
    };

    // Проверяем, не авторизован ли уже пользователь
    const token = localStorage.getItem('token');
    
    // Пробуем авторизоваться сразу и через задержки
    if (!token) {
      // Попытки с разными задержками для мобильных устройств
      [0, 50, 100, 200, 500, 1000].forEach((delay) => {
        setTimeout(() => {
          if (!localStorage.getItem('token')) {
            attemptAutoLogin();
          }
        }, delay);
      });
    }
    

    // Настройка темы Telegram (убрано для версии 6.0+)
    // tg.setHeaderColor('#ffffff');
    // tg.setBackgroundColor('#ffffff');
    
    // Обработка изменения темы
    tg.onEvent('themeChanged', () => {
      const theme = tg.colorScheme;
      document.documentElement.setAttribute('data-theme', theme);
    });

    // Устанавливаем начальную тему
    const theme = tg.colorScheme;
    document.documentElement.setAttribute('data-theme', theme);
    
    // Обработчики событий для получения данных пользователя
    tg.onEvent('viewportChanged', () => {
      if (!localStorage.getItem('token')) {
        attemptAutoLogin();
      }
    });

  }, [loginWithTelegram]);

  return null; // Компонент не рендерит ничего
};

export default TelegramInit;

