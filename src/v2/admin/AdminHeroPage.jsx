import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeHeroImagePosition } from '../../contexts/SiteSettingsContext';
import { api, buildMediaUrl } from '../../utils/api';

const IMAGE_POSITIONS = [
  { id: 'top', label: 'Сверху' },
  { id: 'left', label: 'Слева' },
  { id: 'right', label: 'Справа' },
  { id: 'bottom', label: 'Снизу' },
];

const emptyHero = {
  enabled: true,
  eyebrow: '',
  title: '',
  subtitle: '',
  image_url: null,
  image_position: 'left',
  cta_label: '',
  cta_href: '',
};

function formFromHero(data) {
  return {
    enabled: Boolean(data?.enabled),
    eyebrow: data?.eyebrow ?? '',
    title: data?.title ?? '',
    subtitle: data?.subtitle ?? '',
    image_url: data?.image_url ?? null,
    image_position: normalizeHeroImagePosition(data?.image_position),
    cta_label: data?.cta_label ?? '',
    cta_href: data?.cta_href ?? '',
  };
}

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45';

function titleLines(title) {
  return (title || '').split('\n').filter((line, i, arr) => line.length > 0 || i < arr.length - 1);
}

function PositionChoice({ option, selected, onSelect }) {
  const isOn = selected === option.id;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isOn}
      onClick={() => onSelect(option.id)}
      className={`min-h-[44px] rounded-xl border px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/40 ${
        isOn
          ? 'border-[#22c55e] bg-[#22c55e]/15 text-[#22c55e]'
          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/[0.08]'
      }`}
    >
      {option.label}
    </button>
  );
}

const AdminHeroPage = () => {
  const { isAdminAuthenticated } = useAuth();
  const fileRef = useRef(null);
  const [form, setForm] = useState(emptyHero);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdminAuthenticated) fetchHero();
  }, [isAdminAuthenticated]);

  const fetchHero = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/api/admin/site-settings/hero');
      setForm(formFromHero(data));
    } catch (err) {
      console.error('Error fetching hero:', err);
      setError(err.response?.data?.detail || 'Не удалось загрузить hero');
    } finally {
      setLoading(false);
    }
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage('');
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post('/api/admin/hero-image', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data?.image_url || data?.url || null;
      setField('image_url', url);
    } catch (err) {
      console.error('Error uploading hero image:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки изображения');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const payload = {
        enabled: Boolean(form.enabled),
        eyebrow: form.eyebrow || '',
        title: form.title || '',
        subtitle: form.subtitle || '',
        image_url: form.image_url || null,
        image_position: normalizeHeroImagePosition(form.image_position),
        cta_label: form.cta_label || null,
        cta_href: form.cta_href || null,
      };
      const { data } = await api.put('/api/admin/site-settings/hero', payload);
      const saved = data?.home_hero || payload;
      setForm(formFromHero(saved));
      setMessage('Сохранено');
      window.dispatchEvent(new CustomEvent('siteSettingsUpdated'));
    } catch (err) {
      console.error('Error saving hero:', err);
      setError(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-white/50">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загрузка…
      </div>
    );
  }

  const previewImage = buildMediaUrl(form.image_url);
  const lines = titleLines(form.title);
  const previewPosition = normalizeHeroImagePosition(form.image_position);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[Syne] text-2xl font-bold text-white sm:text-3xl">Главный экран</h1>
          <p className="mt-1 text-sm text-white/45">Hero на главной: тексты, картинка, расположение, вкл/выкл</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#22c55e]">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <div className="border-b border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
          Превью
        </div>
        <section className="relative overflow-hidden px-4 pb-6 pt-8 sm:pt-10">
          {!form.enabled ? (
            <p className="text-sm text-white/40">Секция выключена — на сайте не показывается.</p>
          ) : (
            <div className={`mx-auto max-w-6xl${previewImage ? ` v2-hero-grid is-${previewPosition}` : ''}`}>
              {previewImage && (
                <div className="v2-hero-media">
                  <img src={previewImage} alt="" className="v2-hero-img" />
                </div>
              )}
              <div className={previewImage ? 'v2-hero-copy' : undefined}>
                <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">
                  {form.eyebrow || '—'}
                </p>
                <h2 className="mt-3 max-w-3xl font-[Syne] text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
                  {lines.length > 0
                    ? lines.map((line, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <br />}
                          {line || '\u00A0'}
                        </React.Fragment>
                      ))
                    : 'Заголовок'}
                </h2>
                <p className="mt-4 max-w-xl text-sm text-white/50 sm:text-base">
                  {form.subtitle || 'Подзаголовок'}
                </p>
                {form.cta_label && (
                  <a
                    href={form.cta_href || '#'}
                    className="mt-5 inline-flex rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#052e16]"
                    onClick={(e) => e.preventDefault()}
                  >
                    {form.cta_label}
                  </a>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-white">Показывать hero</div>
              <div className="text-xs text-white/40">Если выкл — секция скрыта на главной</div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(form.enabled)}
              onChange={(e) => setField('enabled', e.target.checked)}
              className="h-5 w-5 accent-[#22c55e]"
            />
          </label>

          <div>
            <label className={labelClass} htmlFor="hero-eyebrow">Eyebrow</label>
            <input
              id="hero-eyebrow"
              className={fieldClass}
              value={form.eyebrow}
              onChange={(e) => setField('eyebrow', e.target.value)}
              placeholder="XWinner"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="hero-title">Заголовок</label>
            <textarea
              id="hero-title"
              rows={4}
              className={`${fieldClass} resize-y font-[Syne]`}
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder={'Инструменталы.\nЧёрный экран.\nЗелёный удар.'}
            />
            <p className="mt-1 text-xs text-white/30">Перенос строки = новая строка в заголовке</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="hero-subtitle">Подзаголовок</label>
            <textarea
              id="hero-subtitle"
              rows={3}
              className={`${fieldClass} resize-y`}
              value={form.subtitle}
              onChange={(e) => setField('subtitle', e.target.value)}
              placeholder="Каталог битов…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="hero-cta-label">CTA — текст</label>
              <input
                id="hero-cta-label"
                className={fieldClass}
                value={form.cta_label}
                onChange={(e) => setField('cta_label', e.target.value)}
                placeholder="Слушать каталог"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="hero-cta-href">CTA — ссылка</label>
              <input
                id="hero-cta-href"
                className={fieldClass}
                value={form.cta_href}
                onChange={(e) => setField('cta_href', e.target.value)}
                placeholder="/#catalog"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
          <div>
            <p className={labelClass}>Картинка</p>
            {previewImage ? (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <img src={previewImage} alt="Hero preview" className="aspect-square w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] text-sm text-white/35">
                Нет изображения
              </div>
            )}
          </div>

          <fieldset>
            <legend className={labelClass}>Расположение</legend>
            <div
              role="radiogroup"
              aria-label="Расположение картинки"
              className="grid grid-cols-3 gap-2"
            >
              <span aria-hidden="true" />
              <PositionChoice
                option={IMAGE_POSITIONS[0]}
                selected={previewPosition}
                onSelect={(id) => setField('image_position', id)}
              />
              <span aria-hidden="true" />
              <PositionChoice
                option={IMAGE_POSITIONS[1]}
                selected={previewPosition}
                onSelect={(id) => setField('image_position', id)}
              />
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03]" aria-hidden="true" />
              <PositionChoice
                option={IMAGE_POSITIONS[2]}
                selected={previewPosition}
                onSelect={(id) => setField('image_position', id)}
              />
              <span aria-hidden="true" />
              <PositionChoice
                option={IMAGE_POSITIONS[3]}
                selected={previewPosition}
                onSelect={(id) => setField('image_position', id)}
              />
              <span aria-hidden="true" />
            </div>
          </fieldset>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/5 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {previewImage ? 'Заменить' : 'Загрузить'}
            </button>
            {form.image_url && (
              <button
                type="button"
                onClick={() => setField('image_url', null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Убрать
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHeroPage;
