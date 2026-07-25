/**
 * Страница отдельного бита
 * 
 * Отображает детальную информацию о бите и предоставляет функции:
 * - Прослушивание демо-версии с полным аудио плеером
 * - Добавление/удаление из избранного
 * - Добавление/удаление из корзины
 * - Покупка бита (бесплатные и платные)
 * - Скачивание купленных битов
 * - Перемотка на -10/+10 секунд
 * 
 * Интегрируется с глобальным аудио плеером и мини-плеером
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useNotification } from '../contexts/NotificationContext';
import api, { buildMediaUrl } from '../utils/api';
import { Heart, ShoppingCart, Download, ArrowLeft, Check, Play, Pause } from 'lucide-react';

/**
 * Компонент страницы бита
 * @returns {JSX.Element} JSX элемент страницы бита
 */
const BeatPage = () => {
  // Параметры маршрута и навигация
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Контексты
  const { isAuthenticated } = useAuth();
  const { isCurrentTrack, playTrack, pauseTrack, isCurrentTrackPlaying } = useAudioPlayer();
  const { showSuccess, showError } = useNotification();
  
  // Состояние компонента
  const [beat, setBeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [selectedPurchaseType, setSelectedPurchaseType] = useState('mp3'); // 'wav', 'mp3', 'exclusive'
  const [purchasedTypes, setPurchasedTypes] = useState([]); // Массив купленных типов

  useEffect(() => {
    fetchBeat();
  }, [id]);

  useEffect(() => {
    // Обновляем статус после загрузки бита
    if (beat && isAuthenticated) {
      checkBeatStatus();
    }
  }, [beat, isAuthenticated, id]);

  const fetchBeat = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/beats/${id}`);
      setBeat(response.data);
    } catch (error) {
      console.error('Error fetching beat:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const checkBeatStatus = async () => {
    try {
      // Check if beat is purchased
      const purchasesResponse = await api.get('/purchases');
      const purchasedBeats = purchasesResponse.data;
      const isBeatPurchased = purchasedBeats.some(purchasedBeat => purchasedBeat.id === parseInt(id));
      setIsPurchased(isBeatPurchased);
      
      // Если бит куплен, получаем реальные купленные типы из API
      if (isBeatPurchased && beat) {
        try {
          const purchasesInfo = await api.get(`/beats/${id}/purchases`);
          const purchasedTypesList = purchasesInfo.data.purchased_types || [];
          
          // Если бит одноразовый (allow_multiple_purchases = false) и куплен как exclusive,
          // показываем только exclusive, иначе показываем все купленные типы
          if (!beat.allow_multiple_purchases && purchasedTypesList.includes('exclusive')) {
            setPurchasedTypes(['exclusive']);
          } else {
            setPurchasedTypes(purchasedTypesList);
          }
        } catch (error) {
          console.error('Error fetching purchase types:', error);
          // Fallback: определяем доступные типы из самого бита
          const availableTypes = [];
          if (beat.wav_url) availableTypes.push('wav');
          if (beat.mp3_url) availableTypes.push('mp3');
          if (beat.exclusive_url) availableTypes.push('exclusive');
          if (availableTypes.length === 0) {
            if (beat.full_audio_url) availableTypes.push('mp3');
            if (beat.project_files_url) availableTypes.push('exclusive');
          }
          setPurchasedTypes(availableTypes);
        }
      }

      // Check if beat is in favorites
      const favoritesResponse = await api.get('/favorites');
      const favorites = favoritesResponse.data;
      const isBeatFavorite = favorites.some(fav => fav.id === parseInt(id));
      setIsFavorite(isBeatFavorite);

      // Check if beat is in cart
      const cartResponse = await api.get('/cart');
      const cartItems = cartResponse.data;
      const isBeatInCart = cartItems.some(item => item.id === parseInt(id));
      setIsInCart(isBeatInCart);
    } catch (error) {
      console.error('Error checking beat status:', error);
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
      // Уведомляем хедер об обновлении избранного
      window.dispatchEvent(new Event('favoritesUpdated'));
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
      // Уведомляем хедер об обновлении корзины
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error toggling cart:', error);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      showError('Войдите, чтобы купить бит');
      return;
    }
    
    // Определяем цену в зависимости от типа покупки
    let actualPrice = beat.price;
    if (selectedPurchaseType === 'mp3' && beat.price_mp3 !== null && beat.price_mp3 !== undefined) {
      actualPrice = beat.price_mp3;
    } else if (selectedPurchaseType === 'wav' && beat.price_wav !== null && beat.price_wav !== undefined) {
      actualPrice = beat.price_wav;
    } else if (selectedPurchaseType === 'exclusive' && beat.price_exclusive !== null && beat.price_exclusive !== undefined) {
      actualPrice = beat.price_exclusive;
    }
    
    // Всегда переходим на тестовую страницу оплаты (даже для бесплатных)
    const params = new URLSearchParams();
    params.append('type', 'beat');
    params.append('item_id', id.toString());
    params.append('purchase_type', selectedPurchaseType);
    params.append('total_price', actualPrice.toString());
    navigate(`/test-payment?${params.toString()}`);
  };

  const handleDownload = async (downloadType = null) => {
    if (!isAuthenticated || !isPurchased) return;
    
    const typeToDownload = downloadType || selectedPurchaseType;
    
    // Проверяем, куплен ли этот тип
    if (!purchasedTypes.includes(typeToDownload)) {
      showError(`Вы не купили этот бит в формате ${typeToDownload.toUpperCase()}`);
      return;
    }
    
    try {
      // Получаем файл через API с авторизацией
      const response = await api.get(`/beats/${id}/download?purchase_type=${typeToDownload}`, {
        responseType: 'blob'
      });
      
      // Создаем blob URL
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      
      // Определяем имя файла в зависимости от типа
      let filename = `${beat.title}`;
      if (typeToDownload === 'wav') filename += '.wav';
      else if (typeToDownload === 'mp3') filename += '.mp3';
      else if (typeToDownload === 'exclusive') filename += '_exclusive.zip';
      
      // Создаем временную ссылку для скачивания
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
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
          <div className="text-gray-600 dark:text-neutral-400">Загрузка бита...</div>
        </div>
      </div>
    );
  }

  if (!beat) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="text-dark-400 text-lg">Бит не найден</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white mb-6 transition-colors border-none bg-transparent p-0"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад
      </button>

        <div className="card">
            <div className="card-header text-center sm:text-left">
              <h1 className="text-2xl font-bold text-black dark:text-white">{beat.title}</h1>
              <p className="text-gray-600 dark:text-neutral-400">{beat.artist}</p>
            </div>
            
            <div className="card-content">
              {(beat.cover_url || beat.demo_url) && (
                <div className="relative w-full max-w-lg mx-auto mb-6 group aspect-square">
                  {beat.cover_url ? (
                    <img
                      src={buildMediaUrl(beat.cover_url)}
                      alt={beat.title}
                      className="w-full h-full object-cover rounded-lg bg-gray-50 dark:bg-neutral-800"
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                      <Play className="h-16 w-16 text-gray-400 dark:text-neutral-500" />
                    </div>
                  )}
                  {beat.demo_url && (
                    <button
                      onClick={() => {
                        const fullUrl = buildMediaUrl(beat.demo_url);
                        const coverUrl = beat.cover_url ? buildMediaUrl(beat.cover_url) : null;
                        playTrack(beat.id, fullUrl, beat.title, coverUrl);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      title="Слушать"
                    >
                      <div className="w-14 h-14 rounded-full bg-white dark:bg-black flex items-center justify-center">
                        {isCurrentTrack(beat.id) && isCurrentTrackPlaying(beat.id) ? (
                          <Pause className="h-7 w-7 text-black dark:text-white ml-0.5" />
                        ) : (
                          <Play className="h-7 w-7 text-black dark:text-white ml-1" />
                        )}
                      </div>
                    </button>
                  )}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-neutral-400">Жанр:</span>
                  <span className="text-black dark:text-white">{beat.genre}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-neutral-400">BPM:</span>
                  <span className="text-black dark:text-white">{beat.bpm}</span>
                </div>
                
                {beat.key && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-neutral-400">Тональность:</span>
                    <span className="text-black dark:text-white">{beat.key}</span>
                  </div>
                )}
                
                {/* Тип лицензии — кнопки как в референсе */}
                {(beat.price_mp3 !== null || beat.price_wav !== null || beat.price_exclusive !== null) && (
                  <div>
                    <span className="text-gray-600 dark:text-neutral-400 block mb-3">Тип лицензии:</span>
                    <div className="flex flex-wrap gap-2">
                      {beat.mp3_url && (beat.price_mp3 !== null && beat.price_mp3 !== undefined) && (
                        <button
                          type="button"
                          onClick={() => setSelectedPurchaseType('mp3')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPurchaseType === 'mp3'
                              ? 'bg-gray-200 dark:bg-neutral-600 text-black dark:text-white'
                              : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          MP3 ({beat.price_mp3 === 0 ? 'Бесплатно' : `${beat.price_mp3.toFixed(0)} ₽`})
                        </button>
                      )}
                      {beat.wav_url && (beat.price_wav !== null && beat.price_wav !== undefined) && (
                        <button
                          type="button"
                          onClick={() => setSelectedPurchaseType('wav')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPurchaseType === 'wav'
                              ? 'bg-gray-200 dark:bg-neutral-600 text-black dark:text-white'
                              : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          WAV ({beat.price_wav === 0 ? 'Бесплатно' : `${beat.price_wav.toFixed(0)} ₽`})
                        </button>
                      )}
                      {beat.exclusive_url && (beat.price_exclusive !== null && beat.price_exclusive !== undefined) && (
                        <button
                          type="button"
                          onClick={() => setSelectedPurchaseType('exclusive')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPurchaseType === 'exclusive'
                              ? 'bg-gray-200 dark:bg-neutral-600 text-black dark:text-white'
                              : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          Exclusive ({beat.price_exclusive === 0 ? 'Бесплатно' : `${beat.price_exclusive.toFixed(0)} ₽`})
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {beat.description && (
                  <div>
                    <span className="text-gray-600 dark:text-neutral-400 block mb-2">Описание:</span>
                    <p className="text-black dark:text-white">{beat.description}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="card-footer">
              {/* Кнопки покупки/скачивания */}
              {isPurchased ? (
                <div className="flex items-center justify-between w-full">
                  {/* Слева - кнопки скачивания без очертаний */}
                  <div className="flex gap-2">
                    {purchasedTypes.includes('wav') && (
                      <button
                        onClick={() => handleDownload('wav')}
                        className="border-none bg-transparent text-black dark:text-white hover:text-gray-600 dark:text-neutral-400 transition-colors "
                        title="Скачать WAV"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {purchasedTypes.includes('mp3') && (
                      <button
                        onClick={() => handleDownload('mp3')}
                        className="border-none bg-transparent text-black dark:text-white hover:text-gray-600 dark:text-neutral-400 transition-colors "
                        title="Скачать MP3"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {purchasedTypes.includes('exclusive') && (
                      <button
                        onClick={() => handleDownload('exclusive')}
                        className="border-none bg-transparent text-black dark:text-white hover:text-gray-600 dark:text-neutral-400 transition-colors "
                        title="Скачать эксклюзив"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Справа - кнопка плей */}
                  <button
                    onClick={async () => {
                      if (isCurrentTrack(beat.id) && isCurrentTrackPlaying(beat.id)) {
                        pauseTrack();
                      } else {
                        const fullUrl = buildMediaUrl(beat.demo_url);
                        const coverUrl = beat.cover_url ? buildMediaUrl(beat.cover_url) : null;
                        playTrack(beat.id, fullUrl, beat.title, coverUrl);
                      }
                    }}
                    className="btn btn-primary btn-sm h-9 ml-auto"
                  >
                    {isCurrentTrack(beat.id) && isCurrentTrackPlaying(beat.id) ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Пауза
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Плей
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  {/* Слева - текст "Купить в один клик" */}
                  <span 
                    className="text-gray-600 dark:text-neutral-400 hover:text-black dark:text-white transition-colors text-sm font-medium cursor-pointer" 
                    onClick={handlePurchase}
                  >
                    Купить в один клик
                  </span>
                  
                  {/* Справа - кнопки избранного и корзины */}
                  {isAuthenticated && (
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={handleFavorite}
                        className={`h-12 w-12 flex items-center justify-center rounded-full border transition-colors ${
                          isFavorite ? 'text-black dark:text-white border-black dark:border-white bg-gray-50 dark:bg-neutral-800' : 'text-gray-500 dark:text-neutral-500 border-gray-300 dark:border-neutral-600 hover:border-black dark:hover:border-white'
                        }`}
                        title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                      >
                        <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      
                      <button
                        onClick={handleAddToCart}
                        className={`h-12 w-12 flex items-center justify-center rounded-full border transition-colors relative ${
                          isInCart ? 'text-black dark:text-white border-black dark:border-white bg-gray-50 dark:bg-neutral-800' : 'text-gray-500 dark:text-neutral-500 border-gray-300 dark:border-neutral-600 hover:border-black dark:hover:border-white'
                        }`}
                        title={isInCart ? 'Удалить из корзины' : 'Добавить в корзину'}
                      >
                        {isInCart ? (
                          <div className="relative">
                            <ShoppingCart className="h-5 w-5" fill="currentColor" />
                            <Check className="h-2 w-2 absolute -top-1 -right-1 bg-green-600 text-white rounded-full" />
                          </div>
                        ) : (
                          <ShoppingCart className="h-5 w-5" fill="none" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-24"></div>
      </div>
    </div>
  );
};

export default BeatPage;


