import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import AuthShellV3 from '../AuthShellV3';
import OauthButtons from '../components/OauthButtons';
import { Button, Field, TextInput } from '../components/Primitives';

export default function LoginPageV3() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
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
          window.history.replaceState({}, '', '/login');
          navigate('/');
        } else setError('Не удалось войти через Telegram');
      } catch {
        setError('Ошибка Telegram. Попробуйте ещё раз.');
        window.history.replaceState({}, '', '/login');
      } finally {
        setLoading(false);
      }
    };
    run();
    return undefined;
  }, [navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(username, password);
    if (result.success) navigate('/');
    else setError(result.error);
    setLoading(false);
  };

  return (
    <AuthShellV3>
      <div className="v3-shell v3-narrow v3-catalog">
        <div className="v3-page-head">
          <h1>Вход</h1>
          <p>Аккаунт XWinner</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          {error && <p className="v3-field-error">{error}</p>}
          <Field label="Имя"><TextInput value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" /></Field>
          <Field label="Пароль"><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></Field>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Вход…' : 'Войти'}</Button>
        </form>
        <OauthButtons loading={loading} onError={setError} />
        <p className="mt-8 text-sm text-[var(--text-muted)]">
          Нет аккаунта? <Link to="/register" className="text-[var(--text)] underline">Регистрация</Link>
        </p>
      </div>
    </AuthShellV3>
  );
}
