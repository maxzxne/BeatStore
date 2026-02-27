import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { api } from '../utils/api';
import { Play, Pause, Heart, ShoppingCart, Download, CheckCircle, Filter } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

// Получаем API URL для построения полных URL файлов
import { buildMediaUrl } from '../utils/api';

const CoursesPage = () => {
  const { isAuthenticated } = useAuth();
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
  }, [filters.purpose, filters.minPrice, filters.maxPrice]);

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
    
    try {
      const course = courses.find(c => c.id === courseId);
      const isFavorite = course?.is_favorite || false;
      
      if (isFavorite) {
        await api.delete(`/courses/${courseId}/favorite`);
      } else {
        await api.post(`/courses/${courseId}/favorite`);
      }
      fetchCourses();
      // Уведомляем хедер об обновлении избранного
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAddToCart = async (courseId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    
    try {
      const course = courses.find(c => c.id === courseId);
      const isInCart = course?.is_in_cart || false;
      
      if (isInCart) {
        await api.delete(`/courses/${courseId}/cart`);
      } else {
        try {
          await api.post(`/courses/${courseId}/cart`);
        } catch (error) {
          // Если курс уже в корзине, просто обновляем список
          if (error.response?.status === 400 && error.response?.data?.detail?.includes('already in cart')) {
            // Обновляем список курсов, чтобы получить актуальное состояние
            fetchCourses();
            return;
          }
          throw error;
        }
      }
      fetchCourses();
      // Уведомляем хедер об обновлении корзины
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error toggling cart:', error);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white mb-1 sm:mb-2">Курсы</h1>
          <p className="text-gray-600 dark:text-neutral-400 text-sm mt-1">
            {loading ? 'Загрузка...' : `${courses.length} курсов`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(prev => !prev)}
          className="p-2 rounded-full border border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-colors flex items-center justify-center"
          aria-label="Фильтры"
        >
          <Filter className="h-4 w-4" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map(course => (
            <Link key={course.id} to={`/course/${course.id}`} className="card group relative hover:border-black dark:hover:border-white transition-colors">
              <div className="relative">
                {course.preview_video_url ? (
                  <div className="w-full h-48 bg-black rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    <video
                      src={buildMediaUrl(course.preview_video_url)}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onMouseEnter={(e) => {
                        e.target.play().catch(() => {});
                      }}
                      onMouseLeave={(e) => {
                        e.target.pause();
                        e.target.currentTime = 0;
                      }}
                      onLoadedMetadata={(e) => {
                        // Устанавливаем первый кадр как превью
                        if (e.target) {
                          e.target.currentTime = 0.1;
                        }
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity pointer-events-none">
                      <div className="bg-black rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 rounded-t-lg flex items-center justify-center">
                    <span className="text-gray-600 dark:text-neutral-400 text-sm font-medium">Курс</span>
                  </div>
                )}
              </div>
              
              <div className="card-content">
                <h3 className="font-semibold text-black dark:text-white mb-1 truncate">{course.title}</h3>
                {course.purpose && (
                  <p className="text-gray-600 dark:text-neutral-400 text-sm mb-2">{course.purpose}</p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-neutral-500 mb-3">
                  {course.tags && (
                    <span className="truncate">{course.tags.split(',')[0]}</span>
                  )}
                  <span className="text-black dark:text-white font-semibold">
                    {course.price === 0 ? 'Бесплатно' : `${course.price.toFixed(0)} ₽`}
                  </span>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-600 dark:text-neutral-400 hover:text-black dark:text-white transition-colors text-sm font-medium">
                    Подробнее
                  </span>
                  
                  {isAuthenticated && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFavorite(course.id, e);
                        }}
                        className={`h-10 w-10 flex items-center justify-center rounded-full border transition-colors ${
                          course.is_favorite ? 'text-black dark:text-white border-black dark:border-white bg-gray-50 dark:bg-neutral-800' : 'text-gray-500 dark:text-neutral-500 border-gray-300 dark:border-neutral-600 hover:border-black dark:hover:border-white'
                        }`}
                        title="Избранное"
                      >
                        <Heart className="h-4 w-4" fill={course.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(course.id, e);
                        }}
                        className={`h-10 w-10 flex items-center justify-center rounded-full border transition-colors ${
                          course.is_in_cart ? 'text-black dark:text-white border-black dark:border-white bg-gray-50 dark:bg-neutral-800' : 'text-gray-500 dark:text-neutral-500 border-gray-300 dark:border-neutral-600 hover:border-black dark:hover:border-white'
                        }`}
                        title="Корзина"
                      >
                        <ShoppingCart className="h-4 w-4" fill={course.is_in_cart ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-20"></div>
    </div>
  );
};

export default CoursesPage;



