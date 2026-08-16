import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { api } from '../utils/api';
import { Play, Pause, Heart, ShoppingCart, Download, CheckCircle, Filter } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

// Получаем API URL для построения полных URL файлов
import { buildMediaUrl } from '../utils/api';

const CoursesPageV2 = () => {
  const { isAuthenticated } = useAuth();
  const { canSeeCourses, loading: settingsLoading } = useSiteSettings();
  const navigate = useNavigate();
  const { playTrack, isCurrentTrackPlaying, pauseTrack } = useAudioPlayer();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    purpose: '',
    minPrice: '',
    maxPrice: ''
  });
  const isFirstLoad = useRef(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!settingsLoading && !canSeeCourses) {
      navigate('/', { replace: true });
    }
  }, [settingsLoading, canSeeCourses, navigate]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.purpose) params.append('purpose', filters.purpose);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      
      const response = await api.get(`/courses?${params.toString()}`);
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Объединенный useEffect с debounce для всех фильтров
  useEffect(() => {
    if (settingsLoading || !canSeeCourses) {
      return;
    }

    // При первой загрузке делаем запрос сразу без задержки
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      fetchCourses();
      return;
    }

    // Для purpose - небольшая задержка, для цен - большая
    const delay = filters.minPrice || filters.maxPrice ? 800 : 300;
    
    const timer = setTimeout(() => {
      fetchCourses();
    }, delay);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.purpose, filters.minPrice, filters.maxPrice, canSeeCourses, settingsLoading]);

  const handlePlay = async (course, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!course.preview_video_url) return;
    
    const previewUrl = buildMediaUrl(course.preview_video_url);
    const isPlaying = isCurrentTrackPlaying(course.id);
    
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack(course.id, previewUrl, course.title);
    }
  };

  const handleFavorite = async (courseId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    
    const course = courses.find(c => c.id === courseId);
    const isFavorite = course?.is_favorite || false;
    
    // Оптимистичное обновление — сразу меняем UI без перезагрузки списка
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, is_favorite: !isFavorite } : c));
    
    try {
      if (isFavorite) {
        await api.delete(`/courses/${courseId}/favorite`);
      } else {
        await api.post(`/courses/${courseId}/favorite`);
      }
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Откатываем при ошибке
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, is_favorite } : c));
    }
  };

  const handleAddToCart = async (courseId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    
    const course = courses.find(c => c.id === courseId);
    const isInCart = course?.is_in_cart || false;
    
    // Оптимистичное обновление — сразу меняем UI без перезагрузки списка
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, is_in_cart: !isInCart } : c));
    
    try {
      if (isInCart) {
        await api.delete(`/courses/${courseId}/cart`);
      } else {
        try {
          await api.post(`/courses/${courseId}/cart`);
        } catch (error) {
          if (error.response?.status === 400 && error.response?.data?.detail?.includes('already in cart')) {
            setCourses(prev => prev.map(c => c.id === courseId ? { ...c, is_in_cart: true } : c));
            window.dispatchEvent(new Event('cartUpdated'));
            return;
          }
          throw error;
        }
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error toggling cart:', error);
      // Откатываем при ошибке
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, is_in_cart } : c));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Learn</p>
          <h1 className="mt-2 font-[Syne] text-4xl font-extrabold">Курсы</h1>
          <p className="mt-2 text-sm text-white/50">
            {loading ? 'Загрузка...' : `${courses.length} курсов`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(prev => !prev)}
          className={`v2-filter-btn ${filtersOpen || filters.purpose || filters.minPrice || filters.maxPrice ? 'is-on' : ''}`}
          aria-expanded={filtersOpen}
        >
          <Filter className="h-4 w-4" />
          Фильтры
        </button>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap gap-4 mb-6">
          <CustomSelect
            value={filters.purpose}
            onChange={(v) => setFilters({ ...filters, purpose: v })}
            options={[
              { value: '', label: 'Все категории' },
              { value: 'сведение', label: 'Сведение' },
              { value: 'битмэйкинг', label: 'Битмэйкинг' },
              { value: 'саунддизайн', label: 'Саунд-дизайн' }
            ]}
            placeholder="Все категории"
            className="w-auto min-w-[200px]"
          />
          
          <input
            type="number"
            placeholder="Мин. цена"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            className="input w-auto min-w-[150px]"
          />
          
          <input
            type="number"
            placeholder="Макс. цена"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            className="input w-auto min-w-[150px]"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[280px]">
          <div className="text-gray-600 dark:text-neutral-400">Загрузка курсов...</div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-600 dark:text-neutral-400 text-lg">Курсы не найдены</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, i) => (
            <Link
              key={course.id}
              to={`/course/${course.id}`}
              className="v2-reveal group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] hover:border-[#22c55e]/40 hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="relative">
                {course.preview_video_url ? (
                  <div className="relative h-52 overflow-hidden bg-black">
                    <video
                      src={buildMediaUrl(course.preview_video_url)}
                      className="h-full w-full object-cover"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onMouseEnter={(e) => { e.target.play().catch(() => {}); }}
                      onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                      onLoadedMetadata={(e) => { if (e.target) e.target.currentTime = 0.1; }}
                    />
                    <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#22c55e] text-[#0f172a]">
                        <Play className="h-5 w-5 ml-0.5" />
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid h-52 place-items-center bg-gradient-to-br from-indigo-950 to-black text-white/30 font-[Syne]">
                    Курс
                  </div>
                )}
              </div>
              
              <div className="space-y-2 p-4">
                <h3 className="truncate font-[Syne] font-bold">{course.title}</h3>
                {course.purpose && (
                  <p className="text-sm text-white/50">{course.purpose}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  {course.tags && (
                    <span className="truncate text-white/40">{course.tags.split(',')[0]}</span>
                  )}
                  <span className="font-semibold text-[#22c55e]">
                    {course.price === 0 ? 'Free' : `${course.price.toFixed(0)} ₽`}
                  </span>
                </div>
                {isAuthenticated && (
                  <div className="flex justify-end gap-1 pt-1">
                    <button
                      type="button"
                      onClick={(e) => handleFavorite(course.id, e)}
                      className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
                      title="Избранное"
                    >
                      <Heart className="h-4 w-4" fill={course.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(course.id, e)}
                      className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
                      title="Корзина"
                    >
                      <ShoppingCart className="h-4 w-4" fill={course.is_in_cart ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoursesPageV2;



