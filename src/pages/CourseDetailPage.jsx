import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { ArrowLeft, Heart, ShoppingCart, Download, Play, Pause, CheckCircle } from 'lucide-react';

// Получаем API URL для построения полных URL файлов
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

const CourseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  useEffect(() => {
    fetchCourse();
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
      showError('Войдите, чтобы добавить в избранное');
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
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showError('Ошибка обновления избранного');
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showError('Войдите, чтобы добавить в корзину');
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
    } catch (error) {
      console.error('Error toggling cart:', error);
      showError(error.response?.data?.detail || 'Ошибка обновления корзины');
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      showError('Войдите, чтобы купить курс');
      return;
    }
    
    try {
      await api.post(`/courses/${id}/purchase`);
      setIsPurchased(true);
      showSuccess('Курс успешно куплен!');
    } catch (error) {
      console.error('Error purchasing course:', error);
      showError(error.response?.data?.detail || 'Ошибка покупки курса');
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

  const toggleVideo = () => {
    setVideoPlaying(!videoPlaying);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Загрузка курса...</div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="text-gray-600 text-lg">Курс не найден</div>
          <button
            onClick={() => navigate('/courses')}
            className="btn btn-outline mt-4"
          >
            Вернуться к курсам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <button
        onClick={() => navigate('/courses')}
        className="flex items-center text-gray-600 hover:text-black mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Назад к курсам
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Левая колонка - Видео и кнопки */}
        <div className="space-y-4">
          {/* Видео превью */}
          {course.preview_video_url ? (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={`${API_URL}${course.preview_video_url}`}
                className="w-full h-full object-cover"
                controls={videoPlaying}
                autoPlay={videoPlaying}
                muted={!videoPlaying}
                playsInline
                onEnded={() => {
                  setVideoPlaying(false);
                }}
                ref={(video) => {
                  if (video) {
                    if (videoPlaying) {
                      video.play();
                    } else {
                      video.pause();
                    }
                  }
                }}
              />
              {!videoPlaying && (
                <button
                  onClick={toggleVideo}
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 hover:bg-opacity-60 transition-opacity"
                >
                  <div className="bg-black rounded-full p-4">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-300 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-lg">Превью недоступно</span>
            </div>
          )}

          {/* Кнопки под видео */}
          <div className="space-y-3">
            {isPurchased ? (
              <button
                onClick={handleDownload}
                className="btn btn-primary w-full h-12 flex items-center justify-center gap-2 text-base"
              >
                <Download className="h-5 w-5" />
                Скачать курс
              </button>
            ) : (
              <button
                onClick={handlePurchase}
                className="btn btn-primary w-full h-12 text-base"
              >
                {course.price === 0 ? 'Получить бесплатно' : `Купить за ${course.price.toFixed(0)} ₽`}
              </button>
            )}

            {isAuthenticated && (
              <div className="flex gap-2">
                <button
                  onClick={handleFavorite}
                  className={`btn btn-outline flex-1 h-12 flex items-center justify-center gap-2 ${
                    isFavorite ? 'bg-gray-50 border-black' : ''
                  }`}
                >
                  <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                  {isFavorite ? 'В избранном' : 'В избранное'}
                </button>

                <button
                  onClick={handleAddToCart}
                  className={`btn btn-outline flex-1 h-12 flex items-center justify-center gap-2 ${
                    isInCart ? 'bg-gray-50 border-black' : ''
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" fill={isInCart ? 'currentColor' : 'none'} />
                  {isInCart ? 'В корзине' : 'В корзину'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Правая колонка - Информация о курсе */}
        <div>
          <h1 className="text-3xl font-bold text-black mb-4">{course.title}</h1>
          
          {course.purpose && (
            <p className="text-lg text-gray-600 mb-4">{course.purpose}</p>
          )}

          {course.tags && (
            <div className="flex flex-wrap gap-2 mb-4">
              {course.tags.split(',').map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          <div className="text-2xl font-bold text-black mb-6">
            {course.price === 0 ? 'Бесплатно' : `${course.price.toFixed(0)} ₽`}
          </div>

          {course.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-black mb-2">Описание</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{course.description}</p>
            </div>
          )}

          {isPurchased && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800">Вы уже купили этот курс</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;

