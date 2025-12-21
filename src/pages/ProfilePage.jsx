import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { User, Mail, Lock, Save } from 'lucide-react';

const ProfilePage = () => {
  const { user, fetchUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      showError('Пароли не совпадают');
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        username: formData.username,
        email: formData.email
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await api.put('/me', updateData);
      showSuccess('Профиль успешно обновлен!');
      
      // Обновляем данные пользователя
      await fetchUser();
      
      // Сбрасываем пароли
      setFormData({
        ...formData,
        password: '',
        confirmPassword: ''
      });
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
          <h1 className="text-2xl font-bold text-black mb-2">Войдите для просмотра профиля</h1>
          <p className="text-gray-600">Вам нужно войти в систему, чтобы просмотреть профиль.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Личный кабинет</h1>
        <p className="text-gray-600">Управление вашим профилем</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Имя пользователя */}
        <div>
          <label htmlFor="profile_username" className="block text-sm font-medium text-black mb-2">
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="profile_email" className="block text-sm font-medium text-black mb-2">
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Пароль */}
        <div>
          <label htmlFor="profile_password" className="block text-sm font-medium text-black mb-2">
            <Lock className="h-4 w-4 inline mr-2" />
            Новый пароль (оставьте пустым, чтобы не менять)
          </label>
          <input
            type="password"
            id="profile_password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Подтверждение пароля */}
        {formData.password && (
          <div>
            <label htmlFor="profile_confirmPassword" className="block text-sm font-medium text-black mb-2">
              <Lock className="h-4 w-4 inline mr-2" />
              Подтверждение пароля
            </label>
            <input
              type="password"
              id="profile_confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-primary h-12 text-base flex items-center justify-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;

