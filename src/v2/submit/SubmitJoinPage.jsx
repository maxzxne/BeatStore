import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const SubmitJoinPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { fetchUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('Ссылка приглашения недействительна');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/submit/join', { token, username, password });
      localStorage.setItem('token', response.data.access_token);
      localStorage.removeItem('adminToken');
      await fetchUser();
      navigate('/submit', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Не удалось войти по приглашению');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        На сайт
      </Link>
      <h1 className="font-[Syne] text-3xl font-bold">Кабинет загрузки</h1>
      <p className="mt-2 text-sm text-white/50">
        Только по приглашению. Если ссылка просрочена — попроси админа выдать новую.
      </p>
      {!token && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          В ссылке нет токена. Открывай приглашение целиком.
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wide text-white/45">
            <User className="h-3.5 w-3.5" />
            Логин
          </span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={fieldClass}
            autoComplete="username"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wide text-white/45">
            <Lock className="h-3.5 w-3.5" />
            Пароль
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={loading || !token}
          className="w-full rounded-full bg-white py-3 text-sm font-semibold text-black hover:bg-[#22c55e] disabled:opacity-40"
        >
          {loading ? 'Входим…' : 'Открыть кабинет'}
        </button>
      </form>
    </div>
  );
};

export default SubmitJoinPage;
