import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { useNotification } from '../contexts/NotificationContext';
import { api, buildMediaUrl } from '../utils/api';
import { checkoutErrorMessage, startCheckout } from '../utils/checkout';
import { loginPath } from '../utils/authRedirect';
import { addGuestCourse, isInGuestCart, removeGuestCourse } from '../utils/guestCart';
import { ArrowLeft, Heart, ShoppingCart, Download, Play, Pause, CheckCircle } from 'lucide-react';

const CourseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { canSeeCourses, loading: settingsLoading } = useSiteSettings();
  const { showSuccess, showError } = useNotification();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!settingsLoading && !canSeeCourses) {
      navigate('/', { replace: true });
    }
  }, [settingsLoading, canSeeCourses, navigate]);

  useEffect(() => {
    if (canSeeCourses) {
      fetchCourse();
    }
  }, [id, isAuthenticated, canSeeCourses]);

  useEffect(() => {
    if (!isAuthenticated && id) {
      setIsInCart(isInGuestCart('course', id));
    }
  }, [id, isAuthenticated]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${id}`);
      const courseData = response.data;
      setCourse(courseData);
      
      // Устанавливаем состояние только если пользователь авторизован
      if (isAuthenticated) {
        setIsFavorite(courseData.is_favorite || false);
        setIsInCart(courseData.is_in_cart || false);
        
        // Проверяем, куплен ли курс
        try {
          const purchasesResponse = await api.get('/course-purchases');
          const purchased = purchasesResponse.data.some(c => c.id === courseData.id);
          setIsPurchased(purchased);
        } catch (error) {
          console.error('Error checking purchase:', error);
        }
      } else {
        // Если не авторизован, сбрасываем состояние
        setIsFavorite(false);
        setIsInCart(false);
        setIsPurchased(false);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      showError('Ошибка загрузки курса');
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate(loginPath(`/course/${id}`));
      return;
    }
    
    try {
      if (isFavorite) {
        await api.delete(`/courses/${id}/favorite`);
        setIsFavorite(false);
        showSuccess('Удалено из избранного');
      } else {
        await api.post(`/courses/${id}/favorite`);
        setIsFavorite(true);
        showSuccess('Добавлено в избранное');
      }
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showError('Ошибка обновления избранного');
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      if (isInCart) {
        removeGuestCourse(id);
        setIsInCart(false);
        showSuccess('Удалено из корзины');
      } else {
        addGuestCourse(id);
        setIsInCart(true);
        showSuccess('Добавлено в корзину — войди, чтобы оформить');
      }
      return;
    }
    
    try {
      if (isInCart) {
        await api.delete(`/courses/${id}/cart`);
        setIsInCart(false);
        showSuccess('Удалено из корзины');
      } else {
        try {
          await api.post(`/courses/${id}/cart`);
          setIsInCart(true);
          showSuccess('Добавлено в корзину');
        } catch (error) {
          // Если курс уже в корзине, просто обновляем состояние
          if (error.response?.status === 400 && error.response?.data?.detail?.includes('already in cart')) {
            setIsInCart(true);
            showSuccess('Курс уже в корзине');
          } else {
            throw error;
          }
        }
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error toggling cart:', error);
      showError(error.response?.data?.detail || 'Ошибка обновления корзины');
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      navigate(loginPath(`/course/${id}`));
      return;
    }
    
    // Если курс бесплатный, покупаем сразу
    if (course.price === 0) {
      try {
        await api.post(`/courses/${id}/purchase`);
        setIsPurchased(true);
        showSuccess('Курс успешно куплен!');
      } catch (error) {
        console.error('Error purchasing course:', error);
        showError(error.response?.data?.detail || 'Ошибка покупки курса');
      }
    } else {
      // Для платных курсов переходим на тестовую страницу оплаты
      try {
        await startCheckout({
          kind: 'course',
          item_id: Number(id),
        });
      } catch (error) {
        showError(checkoutErrorMessage(error));
      }
    }
  };

  const handleDownload = async () => {
    if (!isPurchased) {
      showError('Сначала купите курс');
      return;
    }
    
    try {
      const response = await api.get(`/courses/${id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${course.title}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showSuccess('Загрузка началась');
    } catch (error) {
      console.error('Error downloading course:', error);
      showError('Ошибка загрузки курса');
    }
  };

  const toggleVideo = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
        });
      }
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setVideoCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!videoRef.current || !videoDuration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const newTime = percentage * videoDuration;
    
    videoRef.current.currentTime = newTime;
    setVideoCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const outlineBtn = (active) =>
    `inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm transition ${
      active
        ? 'border-[#22c55e]/50 bg-[#22c55e]/10 text-[#22c55e]'
        : 'border-white/15 text-white/80 hover:bg-white/5'
    }`;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-white/50">Загрузка курса...</div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-lg text-white/50">Курс не найден</p>
        <button
          type="button"
          onClick={() => navigate('/courses')}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm text-white hover:bg-white/5"
        >
          Вернуться к курсам
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        type="button"
        onClick={() => navigate('/courses')}
        className="mb-8 inline-flex items-center border-none bg-transparent p-0 text-sm text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад к курсам
      </button>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          {course.preview_video_url ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              <video
                ref={videoRef}
                src={buildMediaUrl(course.preview_video_url)}
                className="h-full w-full object-cover"
                controls={false}
                playsInline
                preload="metadata"
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onEnded={() => {
                  setVideoPlaying(false);
                  setVideoCurrentTime(0);
                }}
                onError={(e) => {
                  console.error('Video error:', e);
                  showError('Ошибка загрузки видео');
                }}
              />

              {!videoPlaying && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleVideo();
                  }}
                  className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/40 transition-opacity hover:bg-black/50"
                  type="button"
                >
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-[#22c55e] text-[#0f172a] shadow-[0_0_40px_rgba(34,197,94,0.55)]">
                    <Play className="ml-1 h-8 w-8" />
                  </span>
                </button>
              )}

              <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleVideo();
                    }}
                    className="cursor-pointer rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
                    type="button"
                  >
                    {videoPlaying ? (
                      <Pause className="h-5 w-5 text-white" />
                    ) : (
                      <Play className="h-5 w-5 text-white" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div
                      className="relative mb-1 h-1.5 w-full cursor-pointer rounded-full bg-white/30"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full rounded-full bg-[#22c55e] transition-all"
                        style={{
                          width:
                            videoDuration && videoDuration > 0
                              ? `${Math.min((videoCurrentTime / videoDuration) * 100, 100)}%`
                              : '0%',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/80">
                      <span>{formatTime(videoCurrentTime)}</span>
                      <span>{formatTime(videoDuration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.03]">
              <span className="text-lg text-white/40">Превью недоступно</span>
            </div>
          )}

          <div className="space-y-3">
            {isPurchased ? (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-sm text-white transition hover:bg-white/5"
                title="Скачать курс"
              >
                <Download className="h-5 w-5" />
                Скачать курс
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePurchase}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-base font-semibold text-[#0f172a] transition hover:brightness-110"
              >
                {course.price === 0 ? 'Получить бесплатно' : `Купить за ${course.price.toFixed(0)} ₽`}
              </button>
            )}

            {isAuthenticated && (
              <div className="flex gap-2">
                <button type="button" onClick={handleFavorite} className={outlineBtn(isFavorite)}>
                  <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                  {isFavorite ? 'В избранном' : 'В избранное'}
                </button>

                <button type="button" onClick={handleAddToCart} className={outlineBtn(isInCart)}>
                  <ShoppingCart className="h-5 w-5" fill={isInCart ? 'currentColor' : 'none'} />
                  {isInCart ? 'В корзине' : 'В корзину'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="v2-reveal space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#22c55e]">Course</p>
            <h1 className="mt-2 font-[Syne] text-4xl font-extrabold tracking-tight text-white">
              {course.title}
            </h1>
            {course.purpose && <p className="mt-2 text-lg text-white/50">{course.purpose}</p>}
          </div>

          {course.tags && (
            <div className="flex flex-wrap gap-2">
              {course.tags.split(',').map((tag, index) => (
                <span
                  key={index}
                  className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          <div className="font-[Syne] text-3xl font-extrabold text-white">
            {course.price === 0 ? 'Бесплатно' : `${course.price.toFixed(0)} ₽`}
          </div>

          {course.description && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-white">Описание</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/60">{course.description}</p>
            </div>
          )}

          {isPurchased && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#22c55e]">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>Вы уже купили этот курс</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;



