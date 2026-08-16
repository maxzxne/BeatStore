import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { api } from '../../utils/api';
import { Button, Field, Modal, TextInput } from '../components/Primitives';

export default function ProfilePageV3() {
  const { user, fetchUser, logout } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', additional_contact: '' });
  const [loading, setLoading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        additional_contact: user.additional_contact || '',
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="v3-shell v3-narrow v3-catalog">
        <div className="v3-page-head">
          <h1>Профиль</h1>
          <p>Войдите, чтобы управлять аккаунтом</p>
        </div>
        <Link to="/login" className="v3-btn v3-btn-primary w-fit">Войти</Link>
      </div>
    );
  }

  const onChange = (event) => setFormData({ ...formData, [event.target.name]: event.target.value });

  const onSave = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      await api.put('/me', {
        username: formData.username,
        email: formData.email,
        additional_contact: formData.additional_contact || null,
      });
      showSuccess('Профиль обновлён');
      await fetchUser();
    } catch (err) {
      showError(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const onPassword = async (event) => {
    event.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) return showError('Пароли не совпадают');
    if (passwordData.newPassword.length < 6) return showError('Пароль не короче 6 символов');
    try {
      setLoading(true);
      const payload = new FormData();
      payload.append('current_password', passwordData.currentPassword);
      payload.append('new_password', passwordData.newPassword);
      await api.put('/me/change-password', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      showSuccess('Пароль изменён');
      setPasswordOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showError(err.response?.data?.detail || 'Ошибка пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v3-shell v3-narrow v3-catalog">
      <div className="v3-page-head">
        <h1>Профиль</h1>
        <p>Аккаунт XWinner. Тема только тёмная.</p>
      </div>
      <form onSubmit={onSave} className="space-y-6">
        <Field label="Имя"><TextInput name="username" value={formData.username} onChange={onChange} required /></Field>
        <Field label="Email"><TextInput type="email" name="email" value={formData.email} onChange={onChange} required /></Field>
        <Field label="Доп. связь">
          <TextInput name="additional_contact" value={formData.additional_contact} onChange={onChange} placeholder="@telegram" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'Сохранение…' : 'Сохранить'}</Button>
          <Button variant="secondary" onClick={() => setPasswordOpen(true)}>Сменить пароль</Button>
        </div>
      </form>
      <div className="v3-panel">
        <Button
          variant="danger"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Выйти
        </Button>
      </div>
      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} labelledBy="pwd-title">
        <h2 id="pwd-title" className="mb-4 text-lg font-semibold">Смена пароля</h2>
        <form onSubmit={onPassword} className="space-y-4">
          <Field label="Текущий">
            <TextInput type="password" value={passwordData.currentPassword} onChange={(event) => setPasswordData({ ...passwordData, currentPassword: event.target.value })} required />
          </Field>
          <Field label="Новый">
            <TextInput type="password" minLength={6} value={passwordData.newPassword} onChange={(event) => setPasswordData({ ...passwordData, newPassword: event.target.value })} required />
          </Field>
          <Field label="Ещё раз">
            <TextInput type="password" minLength={6} value={passwordData.confirmPassword} onChange={(event) => setPasswordData({ ...passwordData, confirmPassword: event.target.value })} required />
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPasswordOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={loading}>{loading ? '…' : 'Изменить'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
