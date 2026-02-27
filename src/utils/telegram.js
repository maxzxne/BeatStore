/**
 * Утилиты для работы с Telegram Web App
 */

/**
 * Проверяет, открыто ли приложение в Telegram
 */
export const isTelegramWebApp = () => {
  return typeof window !== 'undefined' && window.Telegram?.WebApp;
};

/**
 * Получает экземпляр Telegram Web App
 */
export const getTelegramWebApp = () => {
  if (!isTelegramWebApp()) return null;
  return window.Telegram.WebApp;
};

/**
 * Инициализирует Telegram Web App
 */
export const initTelegramWebApp = () => {
  if (!isTelegramWebApp()) return null;
  
  const tg = window.Telegram.WebApp;
  
  // Инициализация
  tg.ready();
  tg.expand(); // Разворачиваем на весь экран
  
  // Настройка темы (убрано для версии 6.0+)
  // tg.setHeaderColor('#ffffff');
  // tg.setBackgroundColor('#ffffff');
  
  return tg;
};

/**
 * Парсит строку initData из Telegram
 */
const parseInitData = (initDataString) => {
  if (!initDataString) return null;
  
  try {
    console.log('parseInitData: начинаем парсинг initData строки');
    console.log('parseInitData: initDataString длина =', initDataString.length);
    console.log('parseInitData: initDataString первые 200 символов =', initDataString.substring(0, 200));
    
    // Пробуем разные способы парсинга
    let params;
    
    // Способ 1: стандартный URLSearchParams
    try {
      params = new URLSearchParams(initDataString);
      const userParam = params.get('user');
      
      if (userParam) {
        console.log('parseInitData: нашли user параметр через URLSearchParams');
        const user = JSON.parse(decodeURIComponent(userParam));
        console.log('parseInitData: успешно распарсили user:', user);
        return user;
      }
    } catch (e) {
      console.log('parseInitData: ошибка при парсинге через URLSearchParams:', e);
    }
    
    // Способ 2: ручной парсинг через split
    try {
      const parts = initDataString.split('&');
      for (const part of parts) {
        if (part.startsWith('user=')) {
          const userParam = part.substring(5); // убираем 'user='
          const user = JSON.parse(decodeURIComponent(userParam));
          console.log('parseInitData: успешно распарсили user через split:', user);
          return user;
        }
      }
    } catch (e) {
      console.log('parseInitData: ошибка при ручном парсинге:', e);
    }
    
    // Способ 3: поиск JSON объекта в строке
    try {
      const userMatch = initDataString.match(/user=([^&]+)/);
      if (userMatch && userMatch[1]) {
        const user = JSON.parse(decodeURIComponent(userMatch[1]));
        console.log('parseInitData: успешно распарсили user через regex:', user);
        return user;
      }
    } catch (e) {
      console.log('parseInitData: ошибка при парсинге через regex:', e);
    }
    
    console.log('parseInitData: не удалось найти user параметр');
    return null;
  } catch (e) {
    console.error('Ошибка парсинга user из initData:', e);
    console.error('initDataString:', initDataString);
    return null;
  }
};

/**
 * Получает данные пользователя из Telegram
 */
export const getTelegramUser = () => {
  const tg = getTelegramWebApp();
  if (!tg) {
    return null;
  }
  
  // Прямой доступ к данным пользователя
  // На мобильных устройствах данные должны быть в initDataUnsafe.user
  let user = null;
  
  // Способ 1: Прямой доступ через initDataUnsafe.user
  if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    user = tg.initDataUnsafe.user;
    if (user && user.id) {
      return user;
    }
  }
  
  // Способ 2: Парсинг initData строки
  if (tg.initData && !user) {
    user = parseInitData(tg.initData);
    if (user && user.id) {
      return user;
    }
  }
  
  // Способ 3: Проверка всех возможных путей
  if (tg.initDataUnsafe) {
    // Пробуем найти user в любом месте объекта
    const keys = Object.keys(tg.initDataUnsafe);
    for (const key of keys) {
      const value = tg.initDataUnsafe[key];
      if (value && typeof value === 'object' && value.id) {
        user = value;
        break;
      }
    }
    if (user && user.id) {
      return user;
    }
  }
  
  return null;
};

/**
 * Получает данные авторизации из Telegram
 */
export const getTelegramAuthData = () => {
  console.log('=== getTelegramAuthData: НАЧАЛО ===');
  const tg = getTelegramWebApp();
  if (!tg) {
    console.error('getTelegramAuthData: Telegram WebApp не найден');
    return null;
  }
  
  // Получаем пользователя через getTelegramUser (который пробует все способы)
  const user = getTelegramUser();
  console.log('getTelegramAuthData: user получен =', user);
  
  if (!user) {
    console.error('❌ getTelegramAuthData: данные пользователя не найдены');
    console.error('=== getTelegramAuthData: КОНЕЦ (ошибка) ===');
    return null;
  }
  
  // Парсим initData строку для получения hash и auth_date
  let hash = null;
  let auth_date = null;
  
  if (tg.initData) {
    console.log('getTelegramAuthData: парсим initData строку для hash и auth_date');
    const params = new URLSearchParams(tg.initData);
    hash = params.get('hash');
    auth_date = params.get('auth_date');
    console.log('getTelegramAuthData: hash из initData =', hash ? 'есть' : 'нет');
    console.log('getTelegramAuthData: auth_date из initData =', auth_date);
  } else if (tg.initDataUnsafe) {
    console.log('getTelegramAuthData: берем hash и auth_date из initDataUnsafe');
    hash = tg.initDataUnsafe.hash;
    auth_date = tg.initDataUnsafe.auth_date;
    console.log('getTelegramAuthData: hash из initDataUnsafe =', hash ? 'есть' : 'нет');
    console.log('getTelegramAuthData: auth_date из initDataUnsafe =', auth_date);
  }
  
  const authData = {
    id: user.id?.toString() || String(user.id),
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    username: user.username || null,
    photo_url: user.photo_url || null,
    auth_date: auth_date || null,
    hash: hash || null
  };
  
  console.log('✅ getTelegramAuthData: данные авторизации:', authData);
  console.log('=== getTelegramAuthData: КОНЕЦ (успех) ===');
  
  return authData;
};

/**
 * Показывает главную кнопку Telegram
 */
export const showMainButton = (text, onClick) => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  
  tg.MainButton.setText(text);
  tg.MainButton.show();
  tg.MainButton.onClick(onClick);
};

/**
 * Скрывает главную кнопку Telegram
 */
export const hideMainButton = () => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  
  tg.MainButton.hide();
};

/**
 * Показывает всплывающее уведомление
 */
export const showTelegramAlert = (message) => {
  const tg = getTelegramWebApp();
  if (!tg) {
    alert(message);
    return;
  }
  
  tg.showAlert(message);
};

/**
 * Показывает подтверждение
 */
export const showTelegramConfirm = (message) => {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    if (!tg) {
      resolve(confirm(message));
      return;
    }
    
    tg.showConfirm(message, (confirmed) => {
      resolve(confirmed);
    });
  });
};

/**
 * Открывает ссылку в Telegram
 */
export const openTelegramLink = (url) => {
  const tg = getTelegramWebApp();
  if (!tg) {
    window.open(url, '_blank');
    return;
  }
  
  tg.openLink(url);
};

/**
 * Закрывает приложение
 */
export const closeTelegramApp = () => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  
  tg.close();
};


