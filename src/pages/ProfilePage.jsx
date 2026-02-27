import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';
import { User, Mail, Lock, Save, Phone, X, LogOut, Sun, Moon } from 'lucide-react';

const ProfilePage = () => {
  const { user, fetchUser, logout } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    additional_contact: '' // Дополнительная связь (Telegram и т.д.)
  });
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        additional_contact: user.additional_contact || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      
      const updateData = {
        username: formData.username,
        email: formData.email,
        additional_contact: formData.additional_contact || null
      };

      await api.put('/me', updateData);
      showSuccess('Профиль успешно обновлен!');
      
      // Обновляем данные пользователя
      await fetchUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      showError(error.response?.data?.detail || 'Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black dark:text-white dark:text-white mb-2">Войдите для просмотра профиля</h1>
          <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Вам нужно войти в систему, чтобы просмотреть профиль.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white dark:text-white mb-2">Личный кабинет</h1>
        <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Управление вашим профилем</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Настройки темы */}
        <div className="p-4 bg-gray-50 dark:bg-neutral-800 dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isDarkMode ? (
                <Moon className="h-5 w-5 text-gray-600 dark:text-neutral-400 dark:text-neutral-300 mr-3" />
              ) : (
                <Sun className="h-5 w-5 text-yellow-500 mr-3" />
              )}
              <div>
                <p className="text-sm font-medium text-black dark:text-white dark:text-white">Тема оформления</p>
                <p className="text-xs text-gray-500 dark:text-neutral-500 dark:text-neutral-500">
                  {isDarkMode ? 'Тёмная тема' : 'Светлая тема'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center gap-2 cursor-pointer">
              <Moon className="h-5 w-5 text-gray-500 dark:text-neutral-400 shrink-0" />
              <input
                type="checkbox"
                checked={!isDarkMode}
                onChange={toggleTheme}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black dark:peer-focus:ring-white rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:border-neutral-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-yellow-400"></div>
              <Sun className="h-5 w-5 text-yellow-500 shrink-0" />
            </label>
          </div>
        </div>

        {/* Имя пользователя */}
        <div>
          <label htmlFor="profile_username" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
            <User className="h-4 w-4 inline mr-2" />
            Имя пользователя
          </label>
          <input
            type="text"
            id="profile_username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-neutral-900 text-black dark:text-white dark:text-white"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="profile_email" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
            <Mail className="h-4 w-4 inline mr-2" />
            Email
          </label>
          <input
            type="email"
            id="profile_email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-neutral-900 text-black dark:text-white dark:text-white"
          />
        </div>

        {/* Дополнительная связь */}
        <div>
          <label htmlFor="profile_additional_contact" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
            <Phone className="h-4 w-4 inline mr-2" />
            Дополнительная связь (Telegram, WhatsApp и т.д.)
          </label>
          <input
            type="text"
            id="profile_additional_contact"
            name="additional_contact"
            value={formData.additional_contact}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-neutral-900 text-black dark:text-white dark:text-white"
            placeholder="Например: @mytelegram, +79991234567"
          />
          <p className="text-xs text-gray-500 dark:text-neutral-500 dark:text-neutral-500 mt-1">
            Эта информация будет автоматически добавляться в ваши заявки
          </p>
        </div>

        {/* Кнопка изменения пароля */}
        <div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full btn btn-outline h-12 text-base flex items-center justify-center"
          >
            <Lock className="h-4 w-4 mr-2" />
            Изменить пароль
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-primary h-12 text-base flex items-center justify-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </form>

      {/* Кнопка выхода */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-neutral-700 dark:border-neutral-800">
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="w-full btn btn-outline h-12 text-base flex items-center justify-center text-red-600 hover:text-red-700 hover:border-red-600 dark:text-red-400 dark:hover:text-red-300 dark:hover:border-red-400"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Выйти из аккаунта
        </button>
      </div>

      {/* Модалка изменения пароля */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full mx-4 border dark:border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black dark:text-white dark:text-white">Изменить пароль</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="text-gray-500 dark:text-neutral-500 hover:text-black dark:text-white dark:text-neutral-400 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              
              if (passwordData.newPassword !== passwordData.confirmPassword) {
                showError('Новые пароли не совпадают');
                return;
              }

              if (passwordData.newPassword.length < 6) {
                showError('Пароль должен быть не менее 6 символов');
                return;
              }

              try {
                setLoading(true);
                const formData = new FormData();
                formData.append('current_password', passwordData.currentPassword);
                formData.append('new_password', passwordData.newPassword);
                
                await api.put('/me/change-password', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });
                showSuccess('Пароль успешно изменен!');
                setShowPasswordModal(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              } catch (error) {
                console.error('Error changing password:', error);
                showError(error.response?.data?.detail || 'Ошибка при изменении пароля');
              } finally {
                setLoading(false);
              }
            }} className="space-y-4">
              <div>
                <label htmlFor="current_password" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
                  Текущий пароль *
                </label>
                <input
                  type="password"
                  id="current_password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-neutral-800 text-black dark:text-white dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
                  Новый пароль *
                </label>
                <input
                  type="password"
                  id="new_password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-neutral-800 text-black dark:text-white dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="confirm_new_password" className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
                  Подтверждение нового пароля *
                </label>
                <input
                  type="password"
                  id="confirm_new_password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-neutral-800 text-black dark:text-white dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 btn btn-outline h-12"
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn btn-primary h-12"
                >
                  {loading ? 'Сохранение...' : 'Изменить пароль'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;


