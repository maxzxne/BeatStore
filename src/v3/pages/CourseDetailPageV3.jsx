import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Pause, Play, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { api, buildMediaUrl } from '../../utils/api';
import { Button, EmptyState, ErrorState, IconButton, Skeleton } from '../components/Primitives';
import { formatPrice, formatTime } from '../format';

export default function CourseDetailPageV3() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { canSeeCourses, loading: settingsLoading } = useSiteSettings();
  const { showSuccess, showError } = useNotification();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!settingsLoading && !canSeeCourses) navigate('/', { replace: true });
  }, [settingsLoading, canSeeCourses, navigate]);

  useEffect(() => {
    if (!canSeeCourses) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/courses/${id}`);
        if (cancelled) return;
        setCourse(response.data);
        if (isAuthenticated) {
          setFavorite(Boolean(response.data.is_favorite));
          setInCart(Boolean(response.data.is_in_cart));
          try {
            const purchases = await api.get('/course-purchases');
            if (!cancelled) setPurchased((purchases.data || []).some((item) => item.id === response.data.id));
          } catch {
            /* optional */
          }
        } else {
          setFavorite(false);
          setInCart(false);
          setPurchased(false);
        }
      } catch {
        if (!cancelled) {
          setCourse(null);
          setError('Не удалось загрузить курс');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, isAuthenticated, canSeeCourses]);

  const toggleVideo = () => {
    const node = videoRef.current;
    if (!node) return;
    if (playing) node.pause();
    else node.play().catch(() => showError('Не удалось запустить видео'));
  };

  const seek = (event) => {
    if (!videoRef.current || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    videoRef.current.currentTime = ((event.clientX - rect.left) / rect.width) * duration;
  };

  const onFavorite = async () => {
    if (!isAuthenticated) return showError('Войдите, чтобы добавить в избранное');
    try {
      if (favorite) await api.delete(`/courses/${id}/favorite`);
      else await api.post(`/courses/${id}/favorite`);
      setFavorite(!favorite);
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch {
      showError('Ошибка избранного');
    }
  };

  const onCart = async () => {
    if (!isAuthenticated) return showError('Войдите, чтобы добавить в корзину');
    try {
      if (inCart) await api.delete(`/courses/${id}/cart`);
      else await api.post(`/courses/${id}/cart`);
      setInCart(!inCart);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      if (err.response?.status === 400) setInCart(true);
      else showError(err.response?.data?.detail || 'Ошибка корзины');
    }
  };

  const onBuy = async () => {
    if (!isAuthenticated) return showError('Войдите, чтобы купить курс');
    if (course.price === 0) {
      try {
        await api.post(`/courses/${id}/purchase`);
        setPurchased(true);
        showSuccess('Курс в библиотеке');
      } catch (err) {
        showError(err.response?.data?.detail || 'Ошибка покупки');
      }
      return;
    }
    const params = new URLSearchParams({ type: 'course', item_id: String(id), total_price: String(course.price) });
    navigate(`/test-payment?${params.toString()}`);
  };

  const onDownload = async () => {
    try {
      const response = await api.get(`/courses/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${course.title}.mp4`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showError('Ошибка загрузки');
    }
  };

  if (loading) {
    return (
      <div className="v3-shell v3-catalog">
        <Skeleton className="min-h-[240px]" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="v3-shell v3-catalog">
        <ErrorState title={error || 'Курс не найден'} action={<Link to="/courses" className="v3-btn v3-btn-secondary">К курсам</Link>} />
      </div>
    );
  }

  const progress = duration ? currentTime / duration : 0;

  return (
    <div className="v3-shell v3-catalog">
      <Link to="/courses" className="v3-btn v3-btn-ghost mb-4 px-0">← К курсам</Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          {course.preview_video_url ? (
            <div className="v3-media">
              <video
                ref={videoRef}
                src={buildMediaUrl(course.preview_video_url)}
                playsInline
                preload="metadata"
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              <button type="button" className="v3-media-play" onClick={toggleVideo} aria-label={playing ? 'Пауза' : 'Смотреть'}>
                {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>
              <div className="v3-stage-wave">
                <button type="button" className="v3-wave block w-full" style={{ height: 8, background: 'var(--border-strong)' }} onClick={seek} aria-label="Прогресс">
                  <span className="block h-full bg-[var(--text)]" style={{ width: `${progress * 100}%` }} />
                </button>
                <div className="v3-data mt-1 flex justify-between text-[var(--text-muted)]">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Превью недоступно" />
          )}
        </div>
        <div>
          <p className="v3-label">{course.purpose || 'Курс'}</p>
          <h1 className="v3-stage-title !text-[clamp(28px,4vw,40px)] mt-2">{course.title}</h1>
          <p className="v3-data mt-4 text-[var(--text)]">{formatPrice(course.price)}</p>
          {course.description && <p className="mt-4 whitespace-pre-wrap text-[var(--text-muted)]">{course.description}</p>}
          {purchased && <p className="v3-label mt-4">Уже в библиотеке</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            {purchased ? (
              <Button onClick={onDownload}>Скачать</Button>
            ) : (
              <Button onClick={onBuy}>{course.price === 0 ? 'Получить бесплатно' : 'Купить'}</Button>
            )}
            {isAuthenticated && (
              <>
                <IconButton label={favorite ? 'Убрать из избранного' : 'В избранное'} onClick={onFavorite}>
                  <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
                </IconButton>
                {!purchased && (
                  <IconButton label={inCart ? 'Убрать из корзины' : 'В корзину'} onClick={onCart}>
                    <ShoppingCart size={16} />
                  </IconButton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
