import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { loginPath } from '../../utils/authRedirect';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const STATUS = {
  draft: { label: 'Черновик', className: 'bg-white/10 text-white/70' },
  pending: { label: 'На проверке', className: 'bg-amber-400/15 text-amber-200' },
  approved: { label: 'Принято', className: 'bg-[#22c55e]/15 text-[#86efac]' },
  rejected: { label: 'Отклонено', className: 'bg-red-500/15 text-red-200' },
};

const emptyForm = {
  title: '',
  artist: '',
  genre: '',
  bpm: '',
  price: '',
  key: '',
  description: '',
};

const SubmitCabinetPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [meError, setMeError] = useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [demoFile, setDemoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const response = await api.get('/api/submit/submissions');
    setItems(response.data);
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        await api.get('/api/submit/me');
        if (!cancelled) {
          setMeError('');
          await load();
        }
      } catch (err) {
        if (!cancelled) {
          setMeError(err.response?.status === 403 ? 'Нет доступа' : 'Не удалось открыть кабинет');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  if (authLoading) {
    return <div className="px-4 py-16 text-center text-white/50">Загрузка…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-[Syne] text-3xl font-bold">Кабинет загрузки</h1>
        <p className="mt-3 text-sm text-white/50">Сюда пускают только по приглашению.</p>
        <Link
          to={loginPath('/submit')}
          className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#22c55e]"
        >
          Войти
        </Link>
      </div>
    );
  }

  if (meError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-[Syne] text-3xl font-bold">Нет доступа</h1>
        <p className="mt-3 text-sm text-white/50">
          Эта страница только для приглашённых. Покупательский аккаунт сюда не проходит.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm text-white/60 hover:text-white">
          На витрину
        </Link>
      </div>
    );
  }

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    if (!demoFile) {
      setError('Нужен демо-файл');
      return;
    }
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '') payload.append(key, value);
      });
      payload.append('demo_file', demoFile);
      const created = await api.post('/api/submit/submissions', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post(`/api/submit/submissions/${created.data.id}/send`);
      setForm(emptyForm);
      setDemoFile(null);
      await load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Не удалось отправить');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить заявку?')) return;
    await api.delete(`/api/submit/submissions/${id}`);
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">Закрытый кабинет</p>
      <h1 className="mt-2 font-[Syne] text-3xl font-bold">Загрузка битов</h1>
      <p className="mt-2 text-sm text-white/50">
        {user?.username}: черновики видишь только ты. В каталог попадёт после апрува.
      </p>

      <form onSubmit={handleCreate} className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">Название</span>
            <input
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">Артист на витрине</span>
            <input
              value={form.artist}
              onChange={(event) => setForm({ ...form, artist: event.target.value })}
              className={fieldClass}
              placeholder="Как показать покупателю"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">Жанр</span>
            <input
              required
              value={form.genre}
              onChange={(event) => setForm({ ...form, genre: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">BPM</span>
            <input
              required
              type="number"
              value={form.bpm}
              onChange={(event) => setForm({ ...form, bpm: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">Цена ₽</span>
            <input
              required
              type="number"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">Демо MP3/WAV</span>
            <input
              type="file"
              accept="audio/mpeg,audio/wav,.mp3,.wav"
              onChange={(event) => setDemoFile(event.target.files?.[0] || null)}
              className="text-sm text-white/70"
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#22c55e] disabled:opacity-40"
        >
          <Upload className="h-4 w-4" />
          {saving ? 'Отправка…' : 'Отправить на проверку'}
        </button>
      </form>

      <div className="mt-10 space-y-3">
        {items.length === 0 && <p className="text-sm text-white/40">Заявок пока нет.</p>}
        {items.map((item) => {
          const badge = STATUS[item.status] || STATUS.draft;
          return (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{item.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${badge.className}`}>{badge.label}</span>
                </div>
                <p className="mt-1 text-xs text-white/45">
                  {item.artist} · {item.genre} · {item.bpm} BPM
                </p>
                {item.reject_reason && (
                  <p className="mt-2 text-xs text-red-300">{item.reject_reason}</p>
                )}
              </div>
              {item.status !== 'approved' && (
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-red-300"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubmitCabinetPage;
