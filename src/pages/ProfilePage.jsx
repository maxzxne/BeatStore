import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { loginPath } from '../utils/authRedirect';
import {
  CONTACT_TYPES,
  contactsFromUser,
  emptyContactRow,
  formatContacts,
} from '../utils/contacts';
import {
  User,
  Mail,
  Lock,
  Save,
  LogOut,
  X,
  Plus,
  Trash2,
  Shield,
  MessageCircle,
} from 'lucide-react';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const sectionClass =
  'rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6';

const ProfilePage = () => {
  const { user, fetchUser, logout } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      username: user.username || '',
      email: user.email || '',
    });
    const rows = contactsFromUser(user).map((c, i) => ({
      ...c,
      key: `c-${i}-${c.type}`,
    }));
    setContacts(rows.length ? rows : []);
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const updateContact = (key, patch) => {
    setContacts((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const removeContact = (key) => {
    setContacts((prev) => prev.filter((row) => row.key !== key));
  };

  const addContact = () => {
    setContacts((prev) => [...prev, emptyContactRow()]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const cleaned = contacts
        .map(({ type, value }) => ({ type, value: value.trim() }))
        .filter((c) => c.value);
      await api.put('/me', {
        username: formData.username,
        email: formData.email,
        contacts: cleaned,
      });
      showSuccess('Профиль сохранён');
      await fetchUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      showError(error.response?.data?.detail || 'Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const body = user.has_password
        ? { password: deleteConfirm }
        : { confirmation: deleteConfirm };
      await api.delete('/me', { data: body });
      showSuccess('Аккаунт удалён');
      logout();
      navigate('/');
    } catch (error) {
      showError(error.response?.data?.detail || 'Не удалось удалить аккаунт');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className={`${sectionClass} px-6 py-12 text-center`}>
          <User className="mx-auto mb-4 h-12 w-12 text-white/30" />
          <h1 className="font-[Syne] text-2xl font-extrabold text-white">Войдите для просмотра профиля</h1>
          <p className="mt-2 text-sm text-white/50">Нужна авторизация, чтобы открыть личный кабинет.</p>
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

  const preview = formatContacts(
    contacts.map(({ type, value }) => ({ type, value: value.trim() })).filter((c) => c.value)
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Account</p>
        <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Личный кабинет</h1>
        <p className="mt-2 text-sm text-white/50">Профиль, связь и безопасность</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className={sectionClass}>
          <div className="mb-5 flex items-center gap-2">
            <User className="h-4 w-4 text-[#22c55e]" />
            <h2 className="font-[Syne] text-lg font-bold text-white">Аккаунт</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="profile_username" className="mb-2 block text-sm font-medium text-white/80">
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
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-[#22c55e]" />
            <h2 className="font-[Syne] text-lg font-bold text-white">Связь</h2>
          </div>
          <p className="mb-5 text-xs text-white/40">
            Добавь удобные каналы — они подтянутся в заявки на услуги.
          </p>

          <div className="space-y-3">
            {contacts.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/40">
                Пока пусто. Добавь Telegram, WhatsApp или телефон.
              </p>
            )}

            {contacts.map((row) => {
              const meta = CONTACT_TYPES.find((t) => t.value === row.type) || CONTACT_TYPES[5];
              return (
                <div
                  key={row.key}
                  className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[140px_1fr_auto] sm:items-center"
                >
                  <label className="sr-only" htmlFor={`contact-type-${row.key}`}>
                    Тип связи
                  </label>
                  <select
                    id={`contact-type-${row.key}`}
                    value={row.type}
                    onChange={(e) => updateContact(row.key, { type: e.target.value })}
                    className={`${fieldClass} cursor-pointer`}
                  >
                    {CONTACT_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-[#0a0a0a]">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => updateContact(row.key, { value: e.target.value })}
                    placeholder={meta.placeholder}
                    className={fieldClass}
                    aria-label={`Значение ${meta.label}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeContact(row.key)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 sm:w-11"
                    aria-label="Удалить контакт"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addContact}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-medium text-white transition hover:bg-white/5"
          >
            <Plus className="h-4 w-4" />
            Добавить связь
          </button>

          {preview ? (
            <p className="mt-3 text-xs text-white/35">В заявках: {preview}</p>
          ) : null}
        </section>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-base font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-60"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </form>

      <section className={`${sectionClass} mt-5`}>
        <div className="mb-5 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#22c55e]" />
          <h2 className="font-[Syne] text-lg font-bold text-white">Безопасность</h2>
        </div>

        {user.has_password !== false && (
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/15 text-base font-medium text-white transition hover:bg-white/5"
          >
            <Lock className="mr-2 h-4 w-4" />
            Изменить пароль
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full border border-white/15 text-base font-medium text-white/80 transition hover:bg-white/5"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Выйти из аккаунта
        </button>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 text-xs text-white/35">
            Удаление анонимизирует профиль. Покупки в системе останутся, войти снова нельзя.
          </p>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirm('');
              setShowDeleteModal(true);
            }}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-red-500/40 text-base font-medium text-red-400 transition hover:bg-red-500/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить аккаунт
          </button>
        </div>
      </section>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[Syne] text-xl font-bold text-white">Изменить пароль</h2>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="grid h-9 w-9 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
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
                  const fd = new FormData();
                  fd.append('current_password', passwordData.currentPassword);
                  fd.append('new_password', passwordData.newPassword);
                  await api.put('/me/change-password', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  showSuccess('Пароль изменён');
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                } catch (error) {
                  showError(error.response?.data?.detail || 'Ошибка при изменении пароля');
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4"
            >
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
                  Подтверждение *
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
                  {loading ? 'Сохранение...' : 'Изменить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#0a0a0a] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[Syne] text-xl font-bold text-white">Удалить аккаунт?</h2>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-white/55">
              Профиль анонимизируется. Корзина и избранное очистятся. История покупок останется в системе без твоих данных. Это необратимо.
            </p>
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label htmlFor="delete_confirm" className="mb-2 block text-sm font-medium text-white/80">
                  {user.has_password !== false
                    ? 'Введи пароль для подтверждения'
                    : `Введи «${user.email || user.username}»`}
                </label>
                <input
                  type={user.has_password !== false ? 'password' : 'text'}
                  id="delete_confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  required
                  className={fieldClass}
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-white/15 font-medium text-white transition hover:bg-white/5"
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading || !deleteConfirm}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-red-500 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? 'Удаление...' : 'Удалить навсегда'}
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
