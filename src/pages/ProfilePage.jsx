import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { loginPath } from '../utils/authRedirect';
import { User, Mail, Lock, Save, Phone, X, LogOut } from 'lucide-react';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const ProfilePage = () => {
  const { user, fetchUser, logout } = useAuth();
  const { showSuccess, showError } = useNotification();
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
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-white/30" />
          <h1 className="font-[Syne] text-2xl font-extrabold text-white">Войдите для просмотра профиля</h1>
          <p className="mt-2 text-sm text-white/50">Вам нужно войти в систему, чтобы просмотреть профиль.</p>
          <Link
            to={loginPath('/profile')}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#052e16] transition hover:brightness-110"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Account</p>
        <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Личный кабинет</h1>
        <p className="mt-2 text-sm text-white/50">Управление вашим профилем</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        {/* Имя пользователя */}
        <div>
          <label htmlFor="profile_username" className="mb-2 block text-sm font-medium text-white/80">
            <User className="mr-2 inline h-4 w-4" />
            Имя пользователя
          </label>
          <input
            type="text"
            id="profile_username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            required
            className={fieldClass}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="profile_email" className="mb-2 block text-sm font-medium text-white/80">
            <Mail className="mr-2 inline h-4 w-4" />
            Email
          </label>
          <input
            type="email"
            id="profile_email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className={fieldClass}
          />
        </div>

        {/* Дополнительная связь */}
        <div>
          <label htmlFor="profile_additional_contact" className="mb-2 block text-sm font-medium text-white/80">
            <Phone className="mr-2 inline h-4 w-4" />
            Дополнительная связь (Telegram, WhatsApp и т.д.)
          </label>
          <input
            type="text"
            id="profile_additional_contact"
            name="additional_contact"
            value={formData.additional_contact}
            onChange={handleInputChange}
            className={fieldClass}
            placeholder="Например: @mytelegram, +79991234567"
          />
          <p className="mt-1 text-xs text-white/40">
            Эта информация будет автоматически добавляться в ваши заявки
          </p>
        </div>

        {/* Кнопка изменения пароля */}
        <div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/15 text-base font-medium text-white transition hover:bg-white/5"
          >
            <Lock className="mr-2 h-4 w-4" />
            Изменить пароль
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-base font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-60"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </form>

      {/* Кнопка выхода */}
      <div className="mt-8 border-t border-white/10 pt-6">
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="inline-flex h-12 w-full items-center justify-center rounded-full border border-red-500/40 text-base font-medium text-red-400 transition hover:bg-red-500/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Выйти из аккаунта
        </button>
      </div>

      {/* Модалка изменения пароля */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[Syne] text-xl font-bold text-white">Изменить пароль</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="grid h-9 w-9 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
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
                <label htmlFor="current_password" className="mb-2 block text-sm font-medium text-white/80">
                  Текущий пароль *
                </label>
                <input
                  type="password"
                  id="current_password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="new_password" className="mb-2 block text-sm font-medium text-white/80">
                  Новый пароль *
                </label>
                <input
                  type="password"
                  id="new_password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="confirm_new_password" className="mb-2 block text-sm font-medium text-white/80">
                  Подтверждение нового пароля *
                </label>
                <input
                  type="password"
                  id="confirm_new_password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  className={fieldClass}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-white/15 font-medium text-white transition hover:bg-white/5 disabled:opacity-60"
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-[#22c55e] font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-60"
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
