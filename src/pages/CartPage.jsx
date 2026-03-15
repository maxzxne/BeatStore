import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useNotification } from '../contexts/NotificationContext';
import BeatCard from '../components/BeatCard';
import MiniPlayer from '../components/MiniPlayer';
import { api, buildMediaUrl } from '../utils/api';
import { ShoppingCart, Trash2, Play, Pause } from 'lucide-react';

const CartPage = () => {
  const { isAuthenticated } = useAuth();
  const { playTrack, isCurrentTrack, isCurrentTrackPlaying } = useAudioPlayer();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  // Состояние выбранных форматов для каждого бита: { beatId: 'mp3' | 'wav' | 'exclusive' }
  const [selectedFormats, setSelectedFormats] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      // Получаем и биты, и курсы из корзины
      const [beatsResponse, coursesResponse] = await Promise.all([
        api.get('/cart').catch(() => ({ data: [] })),
        api.get('/course-cart').catch(() => ({ data: [] }))
      ]);
      
      // Объединяем биты и курсы, добавляя тип для различения
      const beats = beatsResponse.data.map(item => ({ ...item, type: 'beat' }));
      const courses = coursesResponse.data.map(item => ({ ...item, type: 'course' }));
      setCartItems([...beats, ...courses]);
      
      // Инициализируем выбранные форматы для битов (по умолчанию mp3, если доступен)
      const formats = {};
      beats.forEach(beat => {
        if (beat.mp3_url) {
          formats[beat.id] = 'mp3';
        } else if (beat.wav_url) {
          formats[beat.id] = 'wav';
        } else if (beat.exclusive_url) {
          formats[beat.id] = 'exclusive';
        }
      });
      setSelectedFormats(formats);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId, itemType) => {
    try {
      if (itemType === 'course') {
        await api.delete(`/courses/${itemId}/cart`);
      } else {
        await api.delete(`/beats/${itemId}/cart`);
      }
      setCartItems(cartItems.filter(item => item.id !== itemId));
      
      // Удаляем формат из состояния, если это бит
      if (itemType === 'beat') {
        const newFormats = { ...selectedFormats };
        delete newFormats[itemId];
        setSelectedFormats(newFormats);
      }
      
      showSuccess('Удалено из корзины');
    } catch (error) {
      console.error('Error removing from cart:', error);
      showError('Ошибка удаления из корзины');
    }
  };

  const handlePlay = (beat) => {
    if (!beat.demo_url) return;
    const trackUrl = buildMediaUrl(beat.demo_url);
    const coverUrl = beat.cover_url ? buildMediaUrl(beat.cover_url) : null;
    playTrack(beat.id, trackUrl, beat.title, coverUrl);
  };

  const handleBulkPurchase = async () => {
    if (totalPrice > 0) return; // Only allow for free items
    
    setPurchasing(true);
    try {
      const freeItems = cartItems.filter(item => {
        if (item.type === 'beat' && (item.price_mp3 !== null || item.price_wav !== null || item.price_exclusive !== null)) {
          const format = selectedFormats[item.id] || 'mp3';
          let price = 0;
          if (format === 'mp3' && item.price_mp3 !== null) price = item.price_mp3;
          else if (format === 'wav' && item.price_wav !== null) price = item.price_wav;
          else if (format === 'exclusive' && item.price_exclusive !== null) price = item.price_exclusive;
          return price === 0;
        }
        return item.price === 0;
      });
      
      const purchasePromises = freeItems.map(item => {
        if (item.type === 'course') {
          return api.post(`/courses/${item.id}/purchase`);
        } else {
          const formData = new FormData();
          const format = selectedFormats[item.id] || 'mp3';
          formData.append('purchase_type', format);
          return api.post(`/beats/${item.id}/purchase`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      });
      
      await Promise.all(purchasePromises);
      
      // Remove purchased items from cart
      setCartItems(cartItems.filter(item => {
        if (item.type === 'beat' && (item.price_mp3 !== null || item.price_wav !== null || item.price_exclusive !== null)) {
          const format = selectedFormats[item.id] || 'mp3';
          let price = 0;
          if (format === 'mp3' && item.price_mp3 !== null) price = item.price_mp3;
          else if (format === 'wav' && item.price_wav !== null) price = item.price_wav;
          else if (format === 'exclusive' && item.price_exclusive !== null) price = item.price_exclusive;
          return price > 0;
        }
        return item.price > 0;
      }));
      
      const beatsCount = freeItems.filter(item => item.type === 'beat').length;
      const coursesCount = freeItems.filter(item => item.type === 'course').length;
      let message = 'Успешно приобретено: ';
      if (beatsCount > 0) message += `${beatsCount} бесплатных битов`;
      if (beatsCount > 0 && coursesCount > 0) message += ' и ';
      if (coursesCount > 0) message += `${coursesCount} бесплатных курсов`;
      message += '!';
      
      showSuccess(message);
      setTimeout(() => {
        navigate('/success');
      }, 1500);
    } catch (error) {
      console.error('Error purchasing items:', error);
      showError('Ошибка при покупке');
    } finally {
      setPurchasing(false);
    }
  };

  // Пересчитываем общую цену с учетом выбранных форматов
  const totalPrice = cartItems.reduce((sum, item) => {
    if (item.type === 'beat' && (item.price_mp3 !== null || item.price_wav !== null || item.price_exclusive !== null)) {
      const format = selectedFormats[item.id] || 'mp3';
      let price = 0;
      if (format === 'mp3' && item.price_mp3 !== null) price = item.price_mp3;
      else if (format === 'wav' && item.price_wav !== null) price = item.price_wav;
      else if (format === 'exclusive' && item.price_exclusive !== null) price = item.price_exclusive;
      return sum + price;
    }
    return sum + item.price;
  }, 0);
  const freeItemsCount = cartItems.filter(item => item.price === 0).length;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <ShoppingCart className="h-16 w-16 text-gray-400 dark:text-neutral-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-black dark:text-white dark:text-white mb-2">Войдите для просмотра корзины</h1>
          <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Вам нужно войти в систему, чтобы увидеть корзину.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Загрузка корзины...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white dark:text-white mb-2">Корзина</h1>
        <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">
          {cartItems.length} товаров в корзине
        </p>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 text-gray-400 dark:text-neutral-500 mx-auto mb-4" />
          <div className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400 text-lg">Ваша корзина пуста</div>
          <p className="text-gray-500 dark:text-neutral-500 dark:text-neutral-500 mt-2">
            Добавьте биты в корзину, чтобы начать
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {cartItems.map(item => (
                <div key={`${item.type}-${item.id}`} className="card">
                  <div className="card-content py-4">
                    <div className="flex items-center space-x-4 min-h-[80px]">
                      <div className="flex items-center justify-center relative group">
                        {item.type === 'course' ? (
                          // Для курсов показываем превью видео или плейсхолдер
                          item.preview_video_url ? (
                            <div className="w-16 h-16 bg-black rounded overflow-hidden">
                              <video
                                src={buildMediaUrl(item.preview_video_url)}
                                className="w-full h-full object-cover"
                                muted
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 rounded flex items-center justify-center">
                              <span className="text-gray-600 dark:text-neutral-400 text-xs font-medium">Курс</span>
                            </div>
                          )
                        ) : (
                          // Для битов показываем обложку
                          item.cover_url ? (
                          <img
                              src={buildMediaUrl(item.cover_url)}
                              alt={item.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 rounded flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-black bg-opacity-5"></div>
                            <div className="relative z-10">
                              <span className="text-gray-600 dark:text-neutral-400 text-xs font-medium">XWinner.beats.please</span>
                            </div>
                          </div>
                          )
                        )}
                        
                        {/* Play button overlay только для битов */}
                        {item.type === 'beat' && item.demo_url && (
                          <button
                            onClick={() => handlePlay(item)}
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          >
                            <div className="bg-black rounded-full p-1">
                              {isCurrentTrackPlaying(item.id) ? (
                                <Pause className="h-4 w-4 text-white" />
                              ) : (
                                <Play className="h-4 w-4 text-white" />
                              )}
                            </div>
                          </button>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center">
                        <Link 
                          to={item.type === 'course' ? `/course/${item.id}` : `/beat/${item.id}`}
                          className="font-semibold text-black dark:text-white dark:text-white hover:text-gray-700 dark:hover:text-neutral-300 transition-colors"
                        >
                          {item.title}
                        </Link>
                        {item.type === 'beat' ? (
                          <>
                            <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400 text-sm">{item.artist}</p>
                            <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400 text-sm">{item.genre} • {item.bpm} BPM</p>
                          </>
                        ) : (
                          <>
                            {item.purpose && <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400 text-sm">{item.purpose}</p>}
                            {item.tags && <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400 text-sm">{item.tags.split(',')[0]}</p>}
                          </>
                        )}
                      </div>
                      
                      <div className="text-right flex flex-col justify-center">
                        {item.type === 'beat' && (item.price_mp3 !== null || item.price_wav !== null || item.price_exclusive !== null) ? (
                          <div className="space-y-2">
                            {/* Выбор формата для бита */}
                            <div className="text-xs text-gray-600 dark:text-neutral-400 dark:text-neutral-400 mb-2">Формат:</div>
                            <div className="space-y-1">
                              {item.mp3_url && (item.price_mp3 !== null && item.price_mp3 !== undefined) && (
                                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-gray-50 dark:bg-neutral-800 dark:hover:bg-neutral-800 transition-colors text-xs">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      name={`format-${item.id}`}
                                      value="mp3"
                                      checked={selectedFormats[item.id] === 'mp3'}
                                      onChange={() => setSelectedFormats({ ...selectedFormats, [item.id]: 'mp3' })}
                                      className="w-3 h-3 text-black dark:text-white dark:text-white border-gray-300 dark:border-neutral-700 focus:ring-black dark:focus:ring-white"
                                    />
                                    <span className="text-black dark:text-white dark:text-white">MP3</span>
                                  </div>
                                  <span className="text-black dark:text-white dark:text-white font-semibold">
                                    {item.price_mp3 === 0 ? '0₽' : `${item.price_mp3.toFixed(0)}₽`}
                                  </span>
                                </label>
                              )}
                              {item.wav_url && (item.price_wav !== null && item.price_wav !== undefined) && (
                                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-gray-50 dark:bg-neutral-800 dark:hover:bg-neutral-800 transition-colors text-xs">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      name={`format-${item.id}`}
                                      value="wav"
                                      checked={selectedFormats[item.id] === 'wav'}
                                      onChange={() => setSelectedFormats({ ...selectedFormats, [item.id]: 'wav' })}
                                      className="w-3 h-3 text-black dark:text-white dark:text-white border-gray-300 dark:border-neutral-700 focus:ring-black dark:focus:ring-white"
                                    />
                                    <span className="text-black dark:text-white dark:text-white">WAV</span>
                                  </div>
                                  <span className="text-black dark:text-white dark:text-white font-semibold">
                                    {item.price_wav === 0 ? '0₽' : `${item.price_wav.toFixed(0)}₽`}
                                  </span>
                                </label>
                              )}
                              {item.exclusive_url && (item.price_exclusive !== null && item.price_exclusive !== undefined) && (
                                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-gray-50 dark:bg-neutral-800 dark:hover:bg-neutral-800 transition-colors text-xs">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      name={`format-${item.id}`}
                                      value="exclusive"
                                      checked={selectedFormats[item.id] === 'exclusive'}
                                      onChange={() => setSelectedFormats({ ...selectedFormats, [item.id]: 'exclusive' })}
                                      className="w-3 h-3 text-black dark:text-white dark:text-white border-gray-300 dark:border-neutral-700 focus:ring-black dark:focus:ring-white"
                                    />
                                    <span className="text-black dark:text-white dark:text-white">Exclusive</span>
                                  </div>
                                  <span className="text-black dark:text-white dark:text-white font-semibold">
                                    {item.price_exclusive === 0 ? '0₽' : `${item.price_exclusive.toFixed(0)}₽`}
                                  </span>
                                </label>
                              )}
                            </div>
                            {/* Цена выбранного формата */}
                            <div className="text-lg font-bold text-black dark:text-white dark:text-white mt-2">
                              {(() => {
                                const format = selectedFormats[item.id] || 'mp3';
                                let price = 0;
                                if (format === 'mp3' && item.price_mp3 !== null) price = item.price_mp3;
                                else if (format === 'wav' && item.price_wav !== null) price = item.price_wav;
                                else if (format === 'exclusive' && item.price_exclusive !== null) price = item.price_exclusive;
                                return price === 0 ? 'Бесплатно' : `${price.toFixed(0)} ₽`;
                              })()}
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id, item.type)}
                              className="text-gray-400 dark:text-neutral-500 hover:text-red-500 mt-1"
                              title="Удалить из корзины"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                        <div className="text-lg font-bold text-black dark:text-white dark:text-white">
                          {item.price === 0 ? 'Бесплатно' : `${item.price.toFixed(0)} ₽`}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id, item.type)}
                          className="text-gray-400 dark:text-neutral-500 hover:text-red-500 mt-2"
                          title="Удалить из корзины"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Summary */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-black dark:text-white dark:text-white">Сводка заказа</h2>
              </div>
              
              <div className="card-content">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Промежуточный итог:</span>
                    <span className="text-black dark:text-white dark:text-white">{totalPrice === 0 ? '0 ₽' : `${totalPrice.toFixed(0)} ₽`}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Товаров:</span>
                    <span className="text-black dark:text-white dark:text-white">{cartItems.length}</span>
                  </div>
                  
                  <hr className="border-gray-300 dark:border-neutral-700" />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-black dark:text-white dark:text-white">Итого:</span>
                    <span className="text-black dark:text-white dark:text-white">{totalPrice === 0 ? '0 ₽' : `${totalPrice.toFixed(0)} ₽`}</span>
                  </div>
                </div>
              </div>
              
              <div className="card-footer">
                {freeItemsCount > 0 && totalPrice === 0 ? (
                  <button
                    onClick={handleBulkPurchase}
                    disabled={purchasing}
                    className="btn btn-primary w-full h-12 text-base"
                  >
                    {purchasing ? "Покупка..." : `Получить ${freeItemsCount} бесплатных товаров`}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // Переходим на тестовую страницу оплаты
                      const params = new URLSearchParams();
                      params.append('type', 'cart');
                      params.append('total_price', totalPrice.toString());
                      
                      // Передаем выбранные форматы для битов в корзине
                      const beatsWithFormats = cartItems
                        .filter(item => item.type === 'beat')
                        .map(item => ({
                          id: item.id,
                          format: selectedFormats[item.id] || 'mp3'
                        }));
                      if (beatsWithFormats.length > 0) {
                        params.append('beats_formats', JSON.stringify(beatsWithFormats));
                      }
                      
                      navigate(`/test-payment?${params.toString()}`);
                    }}
                    className="btn btn-primary w-full h-12 text-base"
                    disabled={cartItems.length === 0}
                  >
                    {totalPrice > 0 ? `Оформить заказ на ${totalPrice.toLocaleString('ru-RU')} ₽` : "Перейти к оплате"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <MiniPlayer />
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-20"></div>
    </div>
  );
};

export default CartPage;


