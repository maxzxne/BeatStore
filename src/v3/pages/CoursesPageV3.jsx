import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { api, buildMediaUrl } from '../../utils/api';
import { EmptyState, Skeleton, TextInput } from '../components/Primitives';
import { formatCourseCount, formatPrice } from '../format';

export default function CoursesPageV3() {
  const { isAuthenticated } = useAuth();
  const { canSeeCourses, loading: settingsLoading } = useSiteSettings();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purpose, setPurpose] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const first = useRef(true);

  useEffect(() => {
    if (!settingsLoading && !canSeeCourses) navigate('/', { replace: true });
  }, [settingsLoading, canSeeCourses, navigate]);

  useEffect(() => {
    if (settingsLoading || !canSeeCourses) return undefined;
    const delay = first.current ? 0 : minPrice || maxPrice ? 800 : 300;
    first.current = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (purpose) params.append('purpose', purpose);
        if (minPrice) params.append('min_price', minPrice);
        if (maxPrice) params.append('max_price', maxPrice);
        const response = await api.get(`/courses?${params.toString()}`);
        setCourses(response.data || []);
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [purpose, minPrice, maxPrice, canSeeCourses, settingsLoading]);

  const toggle = async (event, course, kind) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) return;
    const key = kind === 'fav' ? 'is_favorite' : 'is_in_cart';
    const was = Boolean(course[key]);
    setCourses((prev) => prev.map((item) => (item.id === course.id ? { ...item, [key]: !was } : item)));
    try {
      const path = kind === 'fav' ? `/courses/${course.id}/favorite` : `/courses/${course.id}/cart`;
      if (was) await api.delete(path);
      else await api.post(path);
      window.dispatchEvent(new Event(kind === 'fav' ? 'favoritesUpdated' : 'cartUpdated'));
    } catch {
      setCourses((prev) => prev.map((item) => (item.id === course.id ? { ...item, [key]: was } : item)));
    }
  };

  return (
    <div className="v3-shell v3-catalog">
      <div className="v3-page-head v3-catalog-head">
        <h1>Обучение</h1>
        <p className="v3-count">{loading ? '…' : formatCourseCount(courses.length)}</p>
      </div>

      <div className="v3-tabs">
        {[
          ['', 'Все'],
          ['сведение', 'Сведение'],
          ['битмэйкинг', 'Битмэйкинг'],
          ['саунддизайн', 'Саунд-дизайн'],
        ].map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            className={`v3-tab ${purpose === value ? 'is-on' : ''}`}
            onClick={() => setPurpose(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex max-w-md gap-4">
        <TextInput type="number" placeholder="Мин. цена" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} aria-label="Минимальная цена" />
        <TextInput type="number" placeholder="Макс. цена" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} aria-label="Максимальная цена" />
      </div>

      {loading && (
        <div className="v3-tracks">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-[72px] mb-px" />)}
        </div>
      )}

      {!loading && courses.length === 0 && <EmptyState title="Курсы не найдены" />}

      {!loading && courses.length > 0 && (
        <div className="v3-tracks">
          {courses.map((course) => (
            <article key={course.id} className="v3-track">
              <span aria-hidden="true" />
              <Link to={`/course/${course.id}`} className="v3-track-art">
                {course.preview_video_url ? (
                  <video src={buildMediaUrl(course.preview_video_url)} muted playsInline preload="metadata" />
                ) : null}
              </Link>
              <Link to={`/course/${course.id}`} className="min-w-0">
                <div className="v3-track-title">{course.title}</div>
                <div className="v3-track-sub">{course.purpose || 'Курс'}</div>
              </Link>
              <span className="v3-data v3-track-price">{formatPrice(course.price)}</span>
              {isAuthenticated && (
                <div className="v3-track-actions flex justify-end">
                  <button type="button" className="v3-icon-btn" aria-label="Избранное" onClick={(event) => toggle(event, course, 'fav')}>
                    <Heart size={15} fill={course.is_favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" className="v3-icon-btn" aria-label="Корзина" onClick={(event) => toggle(event, course, 'cart')}>
                    <ShoppingCart size={15} />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
