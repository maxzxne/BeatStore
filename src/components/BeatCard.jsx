/**
 * Компонент карточки бита
 * 
 * Отображает информацию о бите и предоставляет функции:
 * - Воспроизведение/пауза демо-версии
 * - Добавление/удаление из избранного
 * - Добавление/удаление из корзины
 * - Переход на страницу бита
 * - Отображение статуса покупки
 * 
 * @param {Object} props - Свойства компонента
 * @param {Object} props.beat - Объект бита с информацией
 * @param {Function} props.onUpdate - Функция обновления состояния
 * @param {boolean} props.isPurchased - Статус покупки бита
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Heart, ShoppingCart, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { api } from '../utils/api';

/**
 * Компонент карточки бита
 * @param {Object} props - Свойства компонента
 * @returns {JSX.Element} JSX элемент карточки бита
 */
const BeatCard = ({ beat, onUpdate, isPurchased = false }) => {
  // Контекст аутентификации
  const { isAuthenticated } = useAuth();
  // Контекст аудио плеера
  const { playTrack, isCurrentTrack, isCurrentTrackPlaying } = useAudioPlayer();
  // Состояние избранного
  const [isFavorite, setIsFavorite] = React.useState(false);
  // Состояние корзины
  const [isInCart, setIsInCart] = React.useState(false);

  // Проверяем статус избранного при загрузке
  useEffect(() => {
    if (isAuthenticated && beat.id) {
      checkFavoriteStatus();
      checkCartStatus();
    }
  }, [isAuthenticated, beat.id]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await api.get('/favorites');
      const favorites = response.data;
      const isInFavorites = favorites.some(fav => fav.id === beat.id);
      setIsFavorite(isInFavorites);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const checkCartStatus = async () => {
    try {
      const response = await api.get('/cart');
      const cartItems = response.data;
      const isInCartItems = cartItems.some(item => item.id === beat.id);
      setIsInCart(isInCartItems);
    } catch (error) {
      console.error('Error checking cart status:', error);
    }
  };

  const handlePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!beat.demo_url) return;

    const trackUrl = `http://localhost:8000${beat.demo_url}`;
    playTrack(beat.id, trackUrl, beat.title);
  };

  const handleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) return;
    
    try {
      if (isFavorite) {
        await api.delete(`/beats/${beat.id}/favorite`);
      } else {
        await api.post(`/beats/${beat.id}/favorite`);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) return;
    
    try {
      if (isInCart) {
        await api.delete(`/beats/${beat.id}/cart`);
      } else {
        await api.post(`/beats/${beat.id}/cart`);
      }
      setIsInCart(!isInCart);
    } catch (error) {
      console.error('Error toggling cart:', error);
    }
  };

  return (
    <Link to={`/beat/${beat.id}`} className="group">
      <div className={`card hover:border-primary-500 transition-colors relative ${
        isPurchased ? 'ring-2 ring-green-500 ring-opacity-50' : ''
      }`}>
        <div className="relative">
          {beat.cover_url ? (
            <img
              src={`http://localhost:8000${beat.cover_url}`}
              alt={beat.title}
              className="w-full h-48 object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-300 rounded-t-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-black bg-opacity-5"></div>
              <div className="relative z-20 text-center">
                <span className="text-gray-600 text-sm font-medium">BeatStore</span>
              </div>
            </div>
          )}
          
          {/* Play button overlay */}
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity z-30"
          >
            <div className="bg-black rounded-full p-3">
              {isCurrentTrackPlaying(beat.id) ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white" />
              )}
            </div>
          </button>

          {/* Purchased badge */}
          {isPurchased && (
            <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full z-40">
              Куплено
            </div>
          )}
        </div>
        
        <div className="card-content">
          <h3 className="font-semibold text-black mb-1 truncate">{beat.title}</h3>
          <p className="text-gray-600 text-sm mb-2">{beat.artist}</p>
          
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <span>{beat.genre}</span>
            <span>{beat.bpm} BPM</span>
            {beat.key && <span>{beat.key}</span>}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-black">
              {beat.price === 0 ? 'Бесплатно' : `${beat.price.toFixed(0)} ₽`}
            </span>
            
            <div className="flex items-center space-x-2">
              {isAuthenticated && (
                <>
                  <button
                    onClick={handleFavorite}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite
                        ? 'text-black hover:text-gray-700'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  
                  {!isPurchased && (
                    <button
                      onClick={handleAddToCart}
                      className={`p-2 rounded-full transition-colors relative ${
                        isInCart
                          ? 'text-black hover:text-gray-700'
                          : 'text-gray-500 hover:text-black'
                      }`}
                      title={isInCart ? 'Удалить из корзины' : 'Добавить в корзину'}
                    >
                      {isInCart ? (
                        <div className="relative">
                          <ShoppingCart className="h-4 w-4" fill="currentColor" />
                          <Check className="h-2 w-2 absolute -top-1 -right-1 bg-green-600 text-white rounded-full" />
                        </div>
                      ) : (
                        <ShoppingCart className="h-4 w-4" fill="none" />
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BeatCard;
