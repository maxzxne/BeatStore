import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Settings, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

const AdminOAuthSettings = () => {
  const { isAdminAuthenticated } = useAuth();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchSettings();
    }
  }, [isAdminAuthenticated]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/oauth-settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching OAuth settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (provider, field, value) => {
    try {
      setSaving(prev => ({ ...prev, [provider]: true }));
      
      // Находим текущую настройку
      const currentSetting = settings.find(s => s.provider === provider);
      if (!currentSetting) {
        throw new Error('Настройка не найдена');
      }
      
      // Оптимистичное обновление UI
      setSettings(prevSettings => 
        prevSettings.map(setting => 
          setting.provider === provider
            ? { ...setting, [field]: value }
            : setting
        )
      );
      
      // Подготавливаем данные для отправки (JSON)
      const updateData = {};
      
      // Отправляем обновленное значение для изменяемого поля
      if (field === 'is_hidden') {
        updateData.is_hidden = value;
        updateData.is_disabled = currentSetting.is_disabled;
      } else if (field === 'is_disabled') {
        updateData.is_disabled = value;
        updateData.is_hidden = currentSetting.is_hidden;
      }
      
      const response = await api.put(`/api/admin/oauth-settings/${provider}`, updateData);
      
      console.log('OAuth setting updated:', response.data);
      
      // Обновляем настройки с сервера для синхронизации
      await fetchSettings();
    } catch (error) {
      console.error('Error updating OAuth setting:', error);
      // Откатываем изменения при ошибке
      await fetchSettings();
      const errorMessage = error.response?.data?.detail || error.message || 'Ошибка обновления настройки';
      alert(errorMessage);
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  const getProviderName = (provider) => {
    const names = {
      google: 'Google',
      vk: 'ВКонтакте',
      yandex: 'Яндекс',
      telegram: 'Telegram'
    };
    return names[provider] || provider;
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'vk':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0077FF">
            <path d="M12.785 16.241s.287-.032.435-.194c.135-.148.131-.427.131-.427s-.02-1.304.58-1.496c.593-.19 1.35.95 2.153 1.37.607.32 1.067.25 1.067.25l2.141-.03s1.118-.07.587-.95c-.044-.07-.308-.64-1.588-1.81-1.344-1.23-1.163-.516.454-1.58 1.01-.83 1.414-1.336 1.287-1.55-.12-.204-.86-.15-.86-.15l-2.207.014s-.163-.022-.284.05c-.12.07-.196.23-.196.23s-.353.94-.82 1.74c-.99 1.65-1.387 1.74-1.549 1.64-.377-.234-.283-.94-.283-1.44 0-1.565.238-2.216-.465-2.38-.234-.055-.406-.09-1.004-.096-.767-.007-1.41.002-1.777.164-.24.106-.423.344-.31.358.138.018.45.083.614.304.213.285.206.92.206.92s.123 1.82-.287 2.045c-.283.152-.673-.158-1.51-1.58-.428-.89-.752-1.87-.752-1.87s-.062-.15-.172-.23c-.133-.098-.318-.13-.318-.13l-2.09-.02s-.313.01-.428.15c-.102.124-.007.38-.007.38s1.68 3.96 3.58 5.96c1.74 1.84 3.72 1.72 3.72 1.72h.888z"/>
          </svg>
        );
      case 'yandex':
        return (
          <svg className="w-5 h-5" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="255.999" cy="256" r="251.408" fill="#FC3F1D"/>
            <path d="M313.475,105.366h-45.648c-44.854,0-82.892,34.142-82.892,100.427  c0,39.765,18.42,69.084,51.25,83.547l-61.262,110.869c-2.005,3.619,0,6.426,3.202,6.426h28.433c2.4,0,4.01-0.801,4.81-2.807  l55.659-108.863h20.021v108.863c0,1.197,1.197,2.807,2.799,2.807h24.832c2.4,0,3.203-1.205,3.203-3.205V109.383  C317.881,106.571,316.279,105.366,313.475,105.366z M287.047,269.26h-16.818c-26.427,0-52.053-19.281-52.053-67.483  c0-50.22,24.024-70.705,48.448-70.705h20.424V269.26z" fill="#FFFFFF"/>
          </svg>
        );
      case 'telegram':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0088cc">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.333-.373-.12l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Доступ запрещен. Войдите как администратор.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Загрузка настроек...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Настройки OAuth авторизации</h1>
        <p className="text-gray-600">Управление видимостью и доступностью кнопок авторизации</p>
      </div>

      <div className="card">
        <div className="card-content">
          <div className="space-y-6">
            {settings.map((setting) => (
              <div key={setting.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100">
                    {getProviderIcon(setting.provider)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-black">{getProviderName(setting.provider)}</h3>
                    <p className="text-sm text-gray-600">Провайдер: {setting.provider}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Скрыть кнопку */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {setting.is_hidden ? (
                        <EyeOff className="h-5 w-5 text-gray-500" />
                      ) : (
                        <Eye className="h-5 w-5 text-green-600" />
                      )}
                      <div>
                        <label className="text-sm font-medium text-black">Скрыть кнопку</label>
                        <p className="text-xs text-gray-500">Убрать кнопку с форм авторизации</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.is_hidden}
                        onChange={(e) => updateSetting(setting.provider, 'is_hidden', e.target.checked)}
                        disabled={saving[setting.provider]}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-black/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                  </div>

                  {/* Дизейблить кнопку */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {setting.is_disabled ? (
                        <Lock className="h-5 w-5 text-red-600" />
                      ) : (
                        <Unlock className="h-5 w-5 text-green-600" />
                      )}
                      <div>
                        <label className="text-sm font-medium text-black">Отключить кнопку</label>
                        <p className="text-xs text-gray-500">Показать кнопку, но сделать неактивной</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.is_disabled}
                        onChange={(e) => updateSetting(setting.provider, 'is_disabled', e.target.checked)}
                        disabled={saving[setting.provider]}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-black/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                  </div>
                </div>

                {saving[setting.provider] && (
                  <p className="text-xs text-gray-500 mt-2">Сохранение...</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOAuthSettings;

