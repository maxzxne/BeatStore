import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Trash2, Image, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { loginPath } from '../../utils/authRedirect';

const emptyForm = {
  title: '',
  artist: '',
  genre: '',
  bpm: '',
  price: '',
  price_mp3: '',
  price_wav: '',
  price_exclusive: '',
  key: '',
  description: '',
};

const emptyFiles = {
  demo_file: null,
  wav_file: null,
  mp3_file: null,
  exclusive_file: null,
  cover_file: null,
};

const STATUS = {
  draft: { label: 'Черновик', className: 'bg-white/10 text-white/70' },
  pending: { label: 'На проверке', className: 'bg-amber-400/15 text-amber-200' },
  approved: { label: 'Принято', className: 'bg-[#22c55e]/15 text-[#86efac]' },
  rejected: { label: 'Отклонено', className: 'bg-red-500/15 text-red-200' },
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
};

const FileSlot = ({
  id,
  name,
  label,
  hint,
  accept,
  required,
  file,
  icon: Icon = Upload,
  acceptHint,
  onChange,
  onDrop,
  onRemove,
}) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
      {label}
      {required ? ' *' : ''}
    </label>
    <div
      onDrop={(event) => onDrop(event, name)}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="relative"
    >
      <input
        type="file"
        id={id}
        name={name}
        accept={accept}
        onChange={onChange}
        className="hidden"
        required={required && !file}
      />
      {file ? (
        <div className="flex items-center justify-between rounded-lg border-2 border-[#22c55e] bg-[#22c55e]/10 p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="rounded-full bg-[#22c55e]/20 p-2">
              <CheckCircle className="h-5 w-5 text-[#86efac]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-white/40">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(name)}
            className="ml-3 rounded-full p-1 hover:bg-red-500/20"
            aria-label={`Убрать ${label}`}
          >
            <X className="h-4 w-4 text-red-300" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] transition-colors hover:border-[#22c55e]/40 hover:bg-white/5"
        >
          <Icon className="mb-2 h-8 w-8 text-white/35" />
          <p className="mb-2 text-sm text-white/40">
            <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
          </p>
          <p className="text-xs text-white/35">{acceptHint}</p>
        </label>
      )}
    </div>
    {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
  </div>
);

const SubmitCabinetPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [meError, setMeError] = useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState(emptyFiles);
  const [fileKey, setFileKey] = useState(0);
  const [allowMultiplePurchases, setAllowMultiplePurchases] = useState(false);
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const { name, files: list } = event.target;
    setFiles((prev) => ({ ...prev, [name]: list?.[0] || null }));
  };

  const handleFileDrop = (event, name) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) setFiles((prev) => ({ ...prev, [name]: file }));
  };

  const handleFileRemove = (name) => {
    setFiles((prev) => ({ ...prev, [name]: null }));
    const input = document.getElementById(`submit_${name}`);
    if (input) input.value = '';
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFiles(emptyFiles);
    setAllowMultiplePurchases(false);
    setFileKey((key) => key + 1);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    if (!files.demo_file) {
      setError('Демо файл обязателен');
      return;
    }
    if (!files.wav_file || !files.mp3_file || !files.exclusive_file) {
      setError('Нужны WAV, MP3 и exclusive ZIP — как в админ-загрузке');
      return;
    }
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '') payload.append(key, value);
      });
      Object.entries(files).forEach(([key, file]) => {
        if (file) payload.append(key, file);
      });
      payload.append('allow_multiple_purchases', allowMultiplePurchases ? 'true' : 'false');

      const created = await api.post('/api/submit/submissions', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post(`/api/submit/submissions/${created.data.id}/send`);
      resetForm();
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">Закрытый кабинет</p>
      <h1 className="mt-2 font-[Syne] text-3xl font-bold">Загрузка битов</h1>
      <p className="mt-2 text-sm text-white/50">
        {user?.username}: форма как в админке. После отправки бит неактивен, пока админ не
        апрувнет и не включит на витрине.
      </p>

      <form key={fileKey} onSubmit={handleCreate} className="mt-8 space-y-6">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-[Syne] text-lg font-semibold text-white">Информация о бите</h2>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="submit_title" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                  Название *
                </label>
                <input
                  id="submit_title"
                  name="title"
                  required
                  value={form.title}
                  onChange={handleInputChange}
                  className="input w-full"
                />
              </div>
              <div>
                <label htmlFor="submit_artist" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                  Исполнитель *
                </label>
                <input
                  id="submit_artist"
                  name="artist"
                  required
                  value={form.artist}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="Как показать покупателю"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="submit_genre" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                  Жанр *
                </label>
                <input
                  id="submit_genre"
                  name="genre"
                  required
                  value={form.genre}
                  onChange={handleInputChange}
                  className="input w-full"
                />
              </div>
              <div>
                <label htmlFor="submit_bpm" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                  BPM *
                </label>
                <input
                  id="submit_bpm"
                  name="bpm"
                  type="number"
                  required
                  value={form.bpm}
                  onChange={handleInputChange}
                  className="input w-full"
                />
              </div>
              <div>
                <label htmlFor="submit_price" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                  Базовая цена (₽) *
                </label>
                <input
                  id="submit_price"
                  name="price"
                  type="number"
                  step="1"
                  required
                  value={form.price}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-white/40">Если нет отдельных цен по форматам</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="submit_price_mp3" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                  Цена MP3 (₽)
                </label>
                <input
                  id="submit_price_mp3"
                  name="price_mp3"
                  type="number"
                  step="1"
                  value={form.price_mp3}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="submit_price_wav" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                  Цена WAV (₽)
                </label>
                <input
                  id="submit_price_wav"
                  name="price_wav"
                  type="number"
                  step="1"
                  value={form.price_wav}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="submit_price_exclusive" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                  Цена Exclusive (₽)
                </label>
                <input
                  id="submit_price_exclusive"
                  name="price_exclusive"
                  type="number"
                  step="1"
                  value={form.price_exclusive}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label htmlFor="submit_key" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                Тональность
              </label>
              <input
                id="submit_key"
                name="key"
                value={form.key}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="например, C, F#, Am"
              />
            </div>

            <div>
              <label htmlFor="submit_description" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
                Описание
              </label>
              <textarea
                id="submit_description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                className="input h-20 w-full resize-none"
                placeholder="Опишите ваш бит..."
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-[Syne] text-lg font-semibold text-white">Аудио файлы</h2>
          </div>
          <div className="space-y-4 p-5">
            <FileSlot
              id="submit_demo_file"
              name="demo_file"
              label="Демо файл (для прослушивания)"
              hint="Короткая превью версия вашего бита"
              accept="audio/*"
              required
              file={files.demo_file}
              acceptHint="AUDIO файлы"
              onChange={handleFileChange}
              onDrop={handleFileDrop}
              onRemove={handleFileRemove}
            />
            <FileSlot
              id="submit_wav_file"
              name="wav_file"
              label="WAV файл"
              hint="WAV версия для покупки"
              accept="audio/wav,audio/*"
              required
              file={files.wav_file}
              acceptHint="WAV файлы"
              onChange={handleFileChange}
              onDrop={handleFileDrop}
              onRemove={handleFileRemove}
            />
            <FileSlot
              id="submit_mp3_file"
              name="mp3_file"
              label="MP3 файл"
              hint="MP3 версия для покупки"
              accept="audio/mpeg,audio/mp3,audio/*"
              required
              file={files.mp3_file}
              acceptHint="MP3 файлы"
              onChange={handleFileChange}
              onDrop={handleFileDrop}
              onRemove={handleFileRemove}
            />
            <FileSlot
              id="submit_exclusive_file"
              name="exclusive_file"
              label="Эксклюзивный файл (ZIP)"
              hint="ZIP архив с FL-проектом, дорожками и другими файлами"
              accept=".zip,application/zip"
              required
              file={files.exclusive_file}
              acceptHint="ZIP архивы"
              onChange={handleFileChange}
              onDrop={handleFileDrop}
              onRemove={handleFileRemove}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-[Syne] text-lg font-semibold text-white">Настройки покупки</h2>
          </div>
          <div className="p-5">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="submit_allow_multiple_purchases"
                checked={allowMultiplePurchases}
                onChange={(event) => setAllowMultiplePurchases(event.target.checked)}
                className="h-4 w-4 rounded border-white/15 text-white focus:ring-black"
              />
              <label htmlFor="submit_allow_multiple_purchases" className="text-sm font-medium text-white">
                Разрешить множественные покупки
              </label>
            </div>
            <p className="mt-2 text-xs text-white/45">
              {allowMultiplePurchases
                ? 'Бит можно покупать много раз (как в аренду)'
                : 'Бит эксклюзивный — только один покупатель (по умолчанию)'}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-[Syne] text-lg font-semibold text-white">Обложка</h2>
          </div>
          <div className="p-5">
            <FileSlot
              id="submit_cover_file"
              name="cover_file"
              label="Обложка"
              hint="JPEG, PNG или WebP. Лучше квадрат 1400×1400."
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              file={files.cover_file}
              icon={Image}
              acceptHint="JPEG, PNG или WebP"
              onChange={handleFileChange}
              onDrop={handleFileDrop}
              onRemove={handleFileRemove}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-[#22c55e] disabled:opacity-40"
        >
          <Upload className="h-4 w-4" />
          {saving ? 'Отправка…' : 'Отправить на проверку'}
        </button>
      </form>

      <div className="mt-10 space-y-3">
        <h2 className="font-[Syne] text-lg font-semibold">Мои заявки</h2>
        {items.length === 0 && <p className="text-sm text-white/40">Заявок пока нет.</p>}
        {items.map((item) => {
          const badge = STATUS[item.status] || STATUS.draft;
          return (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{item.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${badge.className}`}>
                    {badge.label}
                  </span>
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
