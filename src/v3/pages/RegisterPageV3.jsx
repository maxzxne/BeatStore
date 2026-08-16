import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import AuthShellV3 from '../AuthShellV3';
import OauthButtons from '../components/OauthButtons';
import { Button, Field, TextInput } from '../components/Primitives';

export default function RegisterPageV3() {
  const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('telegram_auth') !== '1' || !params.get('chat_id')) return undefined;
    const run = async () => {
      try {
        setLoading(true);
        const payload = new FormData();
        payload.append('chat_id', params.get('chat_id'));
        ['username', 'first_name', 'last_name'].forEach((key) => {
          if (params.get(key)) payload.append(key, params.get(key));
        });
        const response = await api.post('/oauth/telegram-auth', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (response.data.access_token) {
          localStorage.setItem('token', response.data.access_token);
          window.history.replaceState({}, '', '/register');
          navigate('/');
        } else setError('Не удалось войти через Telegram');
      } catch {
        setError('Ошибка Telegram');
        window.history.replaceState({}, '', '/register');
      } finally {
        setLoading(false);
      }
    };
    run();
    return undefined;
  }, [navigate]);

  const onChange = (event) => setFormData({ ...formData, [event.target.name]: event.target.value });

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    const result = await register(formData.email, formData.username, formData.password);
    if (result.success) navigate('/login');
    else setError(result.error);
    setLoading(false);
  };

  return (
    <AuthShellV3>
      <div className="v3-shell v3-narrow v3-catalog">
        <div className="v3-page-head">
          <h1>Регистрация</h1>
          <p>Один аккаунт для битов и заказов</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          {error && <p className="v3-field-error">{error}</p>}
          <Field label="Email"><TextInput type="email" name="email" value={formData.email} onChange={onChange} required /></Field>
          <Field label="Имя"><TextInput name="username" value={formData.username} onChange={onChange} required /></Field>
          <Field label="Пароль"><TextInput type="password" name="password" value={formData.password} onChange={onChange} required minLength={6} /></Field>
          <Field label="Ещё раз"><TextInput type="password" name="confirmPassword" value={formData.confirmPassword} onChange={onChange} required minLength={6} /></Field>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Создание…' : 'Создать аккаунт'}</Button>
        </form>
        <OauthButtons loading={loading} onError={setError} />
        <p className="mt-8 text-sm text-[var(--text-muted)]">
          Уже есть аккаунт? <Link to="/login" className="text-[var(--text)] underline">Войти</Link>
        </p>
      </div>
    </AuthShellV3>
  );
}
