/**
 * Компонент кнопки авторизации через Yandex ID
 * Использует официальный конструктор кнопок Yandex ID
 * Документация: https://yandex.ru/dev/id/doc/ru/suggest/but-const
 */

import React, { useEffect, useRef } from 'react';

const YandexIDButton = ({ 
  clientId, 
  redirectUri, 
  onSuccess, 
  onError,
  disabled = false,
  size = 'L' // L, M, S
}) => {
  const buttonRef = useRef(null);
  const scriptLoaded = useRef(false);
  const initialized = useRef(false);
  const buttonId = useRef(`yandex-id-button-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!clientId) {
      // Не показываем ошибку, если clientId не настроен - просто не рендерим кнопку
      return;
    }

    // Загружаем скрипт Yandex ID SDK только один раз
    if (scriptLoaded.current) {
      if (!initialized.current && buttonRef.current) {
        initYandexID();
      }
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://yastatic.net/s3/passport-sdk/autofill/v1/sdk.min.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
      if (buttonRef.current) {
        initYandexID();
      }
    };
    script.onerror = () => {
      console.error('Failed to load Yandex ID SDK');
      if (onError) onError('Не удалось загрузить Yandex ID SDK');
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Очистка при размонтировании
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
        initialized.current = false;
      }
    };
  }, [clientId, redirectUri]);

  const initYandexID = () => {
    if (!window.YaAuthSuggest || !buttonRef.current || initialized.current) return;
    
    try {
      // Очищаем контейнер перед инициализацией
      buttonRef.current.innerHTML = '';
      
      // Инициализируем Yandex ID согласно документации
      // oauthQueryParams заменяется на блок с параметрами
      const oauthQueryParams = {
        client_id: clientId,
        response_type: 'token',
        redirect_uri: redirectUri
      };
      
      // tokenPageOrigin - origin вспомогательной страницы
      const tokenPageOrigin = window.location.origin;
      
      window.YaAuthSuggest.init(
        oauthQueryParams,
        tokenPageOrigin,
        {
          view: 'button',
          parentId: buttonRef.current.id || buttonId.current,
          buttonView: 'main', // Основная версия кнопки
          buttonTheme: 'light',
          buttonSize: size,
          buttonBorderRadius: 8
        }
      )
      .then(({ handler }) => {
        initialized.current = true;
        
        // Обработчик успешной авторизации
        handler()
          .then((data) => {
            if (onSuccess) {
              onSuccess(data);
            }
          })
          .catch((error) => {
            console.error('Yandex ID auth error:', error);
            if (onError) {
              onError(error.message || 'Ошибка авторизации через Yandex ID');
            }
          });
      })
      .catch((error) => {
        console.error('Yandex ID init error:', error);
        initialized.current = false;
        if (onError) {
          onError(error.message || 'Ошибка инициализации Yandex ID');
        }
      });
    } catch (error) {
      console.error('Yandex ID error:', error);
      initialized.current = false;
      if (onError) {
        onError(error.message || 'Ошибка Yandex ID');
      }
    }
  };

  // Если скрипт уже загружен, но компонент перемонтирован
  useEffect(() => {
    if (scriptLoaded.current && window.YaAuthSuggest && buttonRef.current && !initialized.current) {
      initYandexID();
    }
  }, [clientId, redirectUri, size]);

  // Если clientId не настроен, не рендерим ничего (кнопка будет скрыта через is_hidden)
  if (!clientId) {
    return null;
  }

  return (
    <div 
      id={buttonId.current}
      ref={buttonRef} 
      className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      style={{ minHeight: size === 'L' ? '56px' : size === 'M' ? '44px' : '36px' }}
    />
  );
};

export default YandexIDButton;

