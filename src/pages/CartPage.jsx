import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useNotification } from '../contexts/NotificationContext';
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
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-white/30" />
          <h1 className="font-[Syne] text-2xl font-extrabold text-white">Войдите для просмотра корзины</h1>
          <p className="mt-2 text-sm text-white/50">Вам нужно войти в систему, чтобы увидеть корзину.</p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex h-64 items-center justify-center">
          <div className="text-sm text-white/50">Загрузка корзины...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Checkout</p>
        <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Корзина</h1>
        <p className="mt-2 text-sm text-white/50">
          {cartItems.length} товаров в корзине
        </p>
      </div>

      {cartItems.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-white/30" />
          <div className="font-[Syne] text-xl font-bold text-white">Ваша корзина пуста</div>
          <p className="mt-2 text-sm text-white/50">
            Добавьте биты в корзину, чтобы начать
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
          >
            Смотреть биты
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {cartItems.map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
                >
                  <div className="flex min-h-[80px] items-center gap-4">
                    <div className="relative group flex items-center justify-center">
                      {item.type === 'course' ? (
                        item.preview_video_url ? (
                          <div className="h-16 w-16 overflow-hidden rounded-xl bg-black">
                            <video
                              src={buildMediaUrl(item.preview_video_url)}
                              className="h-full w-full object-cover"
                              muted
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/5">
                            <span className="text-xs font-medium text-white/40">Курс</span>
                          </div>
                        )
                      ) : (
                        item.cover_url ? (
                          <img
                            src={buildMediaUrl(item.cover_url)}
                            alt={item.title}
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                            <span className="text-[10px] font-medium text-white/40">XWinner</span>
                          </div>
                        )
                      )}
                      
                      {item.type === 'beat' && item.demo_url && (
                        <button
                          onClick={() => handlePlay(item)}
                          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <div className="rounded-full bg-[#22c55e] p-1.5 text-[#0f172a]">
                            {isCurrentTrackPlaying(item.id) ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </div>
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-1 flex-col justify-center">
                      <Link 
                        to={item.type === 'course' ? `/course/${item.id}` : `/beat/${item.id}`}
                        className="font-[Syne] font-bold text-white transition-colors hover:text-[#22c55e]"
                      >
                        {item.title}
                      </Link>
                      {item.type === 'beat' ? (
                        <>
                          <p className="text-sm text-white/50">{item.artist}</p>
                          <p className="text-sm text-white/40">{item.genre} • {item.bpm} BPM</p>
                        </>
                      ) : (
                        <>
                          {item.purpose && <p className="text-sm text-white/50">{item.purpose}</p>}
                          {item.tags && <p className="text-sm text-white/40">{item.tags.split(',')[0]}</p>}
                        </>
                      )}
                    </div>
                    
                    <div className="flex flex-col justify-center text-right">
                      {item.type === 'beat' && (item.price_mp3 !== null || item.price_wav !== null || item.price_exclusive !== null) ? (
                        <div className="space-y-2">
                          <div className="mb-2 text-xs text-white/40">Формат:</div>
                          <div className="space-y-1">
                            {item.mp3_url && (item.price_mp3 !== null && item.price_mp3 !== undefined) && (
                              <label className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 text-xs transition-colors hover:bg-white/5">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`format-${item.id}`}
                                    value="mp3"
                                    checked={selectedFormats[item.id] === 'mp3'}
                                    onChange={() => setSelectedFormats({ ...selectedFormats, [item.id]: 'mp3' })}
                                    className="h-3 w-3 accent-[#22c55e]"
                                  />
                                  <span className="text-white">MP3</span>
                                </div>
                                <span className="font-semibold text-white">
                                  {item.price_mp3 === 0 ? '0₽' : `${item.price_mp3.toFixed(0)}₽`}
                                </span>
                              </label>
                            )}
                            {item.wav_url && (item.price_wav !== null && item.price_wav !== undefined) && (
                              <label className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 text-xs transition-colors hover:bg-white/5">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`format-${item.id}`}
                                    value="wav"
                                    checked={selectedFormats[item.id] === 'wav'}
                                    onChange={() => setSelectedFormats({ ...selectedFormats, [item.id]: 'wav' })}
                                    className="h-3 w-3 accent-[#22c55e]"
                                  />
                                  <span className="text-white">WAV</span>
                                </div>
                                <span className="font-semibold text-white">
                                  {item.price_wav === 0 ? '0₽' : `${item.price_wav.toFixed(0)}₽`}
                                </span>
                              </label>
                            )}
                            {item.exclusive_url && (item.price_exclusive !== null && item.price_exclusive !== undefined) && (
                              <label className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 text-xs transition-colors hover:bg-white/5">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`format-${item.id}`}
                                    value="exclusive"
                                    checked={selectedFormats[item.id] === 'exclusive'}
                                    onChange={() => setSelectedFormats({ ...selectedFormats, [item.id]: 'exclusive' })}
                                    className="h-3 w-3 accent-[#22c55e]"
                                  />
                                  <span className="text-white">Exclusive</span>
                                </div>
                                <span className="font-semibold text-white">
                                  {item.price_exclusive === 0 ? '0₽' : `${item.price_exclusive.toFixed(0)}₽`}
                                </span>
                              </label>
                            )}
                          </div>
                          <div className="mt-2 text-lg font-bold text-[#22c55e]">
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
                            className="mt-1 text-white/40 transition hover:text-red-400"
                            title="Удалить из корзины"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-lg font-bold text-[#22c55e]">
                            {item.price === 0 ? 'Бесплатно' : `${item.price.toFixed(0)} ₽`}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id, item.type)}
                            className="mt-2 text-white/40 transition hover:text-red-400"
                            title="Удалить из корзины"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Summary */}
          <div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="font-[Syne] text-lg font-bold text-white">Сводка заказа</h2>
              
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Промежуточный итог:</span>
                  <span className="text-white">{totalPrice === 0 ? '0 ₽' : `${totalPrice.toFixed(0)} ₽`}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Товаров:</span>
                  <span className="text-white">{cartItems.length}</span>
                </div>
                
                <hr className="border-white/10" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Итого:</span>
                  <span className="text-[#22c55e]">{totalPrice === 0 ? '0 ₽' : `${totalPrice.toFixed(0)} ₽`}</span>
                </div>
              </div>
              
              <div className="mt-6">
                {freeItemsCount > 0 && totalPrice === 0 ? (
                  <button
                    onClick={handleBulkPurchase}
                    disabled={purchasing}
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-base font-semibold text-[#0f172a] transition hover:brightness-110 disabled:opacity-60"
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
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-base font-semibold text-[#0f172a] transition hover:brightness-110 disabled:opacity-60"
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
    </div>
  );
};

export default CartPage;
