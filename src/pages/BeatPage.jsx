import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useNotification } from '../contexts/NotificationContext';
import AudioPlayer from '../components/AudioPlayer';
import { api } from '../utils/api';
import { Heart, ShoppingCart, Download, ArrowLeft, Check } from 'lucide-react';

const BeatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { seekTo, currentTime, duration } = useAudioPlayer();
  const { showSuccess, showError } = useNotification();
  const [beat, setBeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);

  useEffect(() => {
    fetchBeat();
  }, [id]);

  const fetchBeat = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/beats/${id}`);
      setBeat(response.data);
      
      if (isAuthenticated) {
        // Check if beat is in favorites, cart, or purchased
        // This would require additional API endpoints
        // For now, we'll assume it's not
        setIsFavorite(false);
        setIsInCart(false);
        setIsPurchased(false);
      }
    } catch (error) {
      console.error('Error fetching beat:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) return;
    
    try {
      if (isFavorite) {
        await api.delete(`/beats/${id}/favorite`);
      } else {
        await api.post(`/beats/${id}/favorite`);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) return;
    
    try {
      if (isInCart) {
        await api.delete(`/beats/${id}/cart`);
      } else {
        await api.post(`/beats/${id}/cart`);
      }
      setIsInCart(!isInCart);
    } catch (error) {
      console.error('Error toggling cart:', error);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) return;
    
    try {
      await api.post(`/beats/${id}/purchase`);
      setIsPurchased(true);
      showSuccess('Бит успешно приобретен!');
      setTimeout(() => {
        navigate('/success');
      }, 1500);
    } catch (error) {
      console.error('Error purchasing beat:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при покупке';
      showError(errorMessage);
    }
  };

  const handleDownload = async () => {
    if (!isAuthenticated || !isPurchased) return;
    
    try {
      // Получаем файл через API с авторизацией
      const response = await api.get(`/beats/${id}/download`, {
        responseType: 'blob'
      });
      
      // Создаем blob URL
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      
      // Создаем временную ссылку для скачивания
      const link = document.createElement('a');
      link.href = url;
      link.download = `${beat.title}_full.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Освобождаем память
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading beat:', error);
      showError('Ошибка скачивания');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Загрузка бита...</div>
        </div>
      </div>
    );
  }

  if (!beat) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="text-dark-400 text-lg">Beat not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <button
        onClick={() => navigate(-1)}
        className="btn btn-outline btn-sm mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Beat Info */}
        <div>
          <div className="card">
            <div className="card-header">
              <h1 className="text-2xl font-bold text-black">{beat.title}</h1>
              <p className="text-gray-600">{beat.artist}</p>
            </div>
            
            <div className="card-content">
              {beat.cover_url && (
                <img
                  src={`http://localhost:8000${beat.cover_url}`}
                  alt={beat.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Жанр:</span>
                  <span className="text-black">{beat.genre}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">BPM:</span>
                  <span className="text-black">{beat.bpm}</span>
                </div>
                
                {beat.key && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Тональность:</span>
                    <span className="text-black">{beat.key}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Цена:</span>
                  <span className="text-2xl font-bold text-black">
                    {beat.price === 0 ? 'Бесплатно' : `${beat.price.toFixed(0)} ₽`}
                  </span>
                </div>
                
                {beat.description && (
                  <div>
                    <span className="text-gray-600 block mb-2">Описание:</span>
                    <p className="text-black">{beat.description}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="card-footer">
              <div className="flex items-center space-x-4 w-full">
                {isAuthenticated && !isPurchased && (
                  <>
                    <button
                      onClick={handleFavorite}
                      className={`btn btn-outline btn-sm ${
                        isFavorite ? 'text-black border-black' : ''
                      }`}
                    >
                      <Heart className="h-4 w-4 mr-2" fill={isFavorite ? 'currentColor' : 'none'} />
                      {isFavorite ? 'В избранном' : 'В избранное'}
                    </button>
                    
                    <button
                      onClick={handleAddToCart}
                      className={`btn btn-outline btn-sm relative ${
                        isInCart ? 'text-black border-black' : ''
                      }`}
                    >
                      {isInCart ? (
                        <div className="flex items-center">
                          <div className="relative mr-2">
                            <ShoppingCart className="h-4 w-4" fill="currentColor" />
                            <Check className="h-2 w-2 absolute -top-1 -right-1 bg-green-600 text-white rounded-full" />
                          </div>
                          В корзине
                        </div>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-2" fill="none" />
                          В корзину
                        </>
                      )}
                    </button>
                  </>
                )}
                
                {isPurchased ? (
                  <button
                    onClick={handleDownload}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать
                  </button>
                ) : (
                  <button
                    onClick={handlePurchase}
                    className="btn btn-primary btn-sm flex-1"
                    disabled={!isAuthenticated}
                  >
                    {beat.price === 0 ? 'Получить бесплатно' : `Купить за ${beat.price.toFixed(0)} ₽`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-black">Превью</h2>
            </div>
            
            <div className="card-content">
              {beat.demo_url ? (
                <div className="space-y-4">
                  <AudioPlayer src={`http://localhost:8000${beat.demo_url}`} title={beat.title} trackId={beat.id} />
                  
                  {/* Дополнительные кнопки управления */}
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={() => {
                        seekTo(Math.max(0, currentTime - 10));
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      ⏪ -10с
                    </button>
                    
                    <button
                      onClick={() => {
                        seekTo(Math.min(duration, currentTime + 10));
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      +10с ⏩
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  Превью недоступно
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-20"></div>
    </div>
  );
};

export default BeatPage;
