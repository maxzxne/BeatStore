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
import AudioPlayer from '../components/AudioPlayer';
import api from '../utils/api';

// Получаем API URL для построения полных URL файлов
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
import MiniPlayer from '../components/MiniPlayer';
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
  const { seekTo, currentTime, duration, isCurrentTrack, playTrack, pauseTrack, isCurrentTrackPlaying } = useAudioPlayer();
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
    
    // Если бит бесплатный, покупаем сразу
    if (actualPrice === 0) {
      try {
        const formData = new FormData();
        formData.append('purchase_type', selectedPurchaseType);
        
        await api.post(`/beats/${id}/purchase`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // Обновляем статус после покупки
        await checkBeatStatus();
        setIsInCart(false);
        showSuccess(`Бит успешно приобретен как ${selectedPurchaseType.toUpperCase()}!`);
        setTimeout(() => {
          navigate('/success');
        }, 1500);
      } catch (error) {
        console.error('Error purchasing beat:', error);
        const errorMessage = error.response?.data?.detail || 'Ошибка при покупке';
        showError(errorMessage);
      }
    } else {
      // Для платных битов всегда переходим на тестовую страницу оплаты
      const params = new URLSearchParams();
      params.append('type', 'beat');
      params.append('item_id', id.toString());
      params.append('purchase_type', selectedPurchaseType);
      params.append('total_price', actualPrice.toString());
      navigate(`/test-payment?${params.toString()}`);
    }
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
          <div className="text-gray-600">Загрузка бита...</div>
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
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-black mb-6 transition-colors border-none bg-transparent p-0"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Beat Info */}
        <div className="flex flex-col">
          <div className="card flex-1">
            <div className="card-header">
              <h1 className="text-2xl font-bold text-black">{beat.title}</h1>
              <p className="text-gray-600">{beat.artist}</p>
            </div>
            
            <div className="card-content">
              {beat.cover_url && (
                <img
                  src={`${API_URL}${beat.cover_url}`}
                  alt={beat.title}
                  className="w-full max-w-md mx-auto h-48 object-contain rounded-lg mb-6 bg-gray-50"
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
                
                {/* Выбор формата с радиокнопками */}
                {(beat.price_mp3 !== null || beat.price_wav !== null || beat.price_exclusive !== null) && (
                  <div>
                    <span className="text-gray-600 block mb-3">Формат:</span>
                    <div className="space-y-2">
                      {beat.mp3_url && (beat.price_mp3 !== null && beat.price_mp3 !== undefined) && (
                        <label className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="format"
                              value="mp3"
                              checked={selectedPurchaseType === 'mp3'}
                              onChange={() => setSelectedPurchaseType('mp3')}
                              className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                            />
                            <span className="text-black font-medium">MP3</span>
                          </div>
                          <span className="text-black font-semibold">
                            {beat.price_mp3 === 0 ? 'Бесплатно' : `${beat.price_mp3.toFixed(0)} ₽`}
                          </span>
                        </label>
                      )}
                      {beat.wav_url && (beat.price_wav !== null && beat.price_wav !== undefined) && (
                        <label className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="format"
                              value="wav"
                              checked={selectedPurchaseType === 'wav'}
                              onChange={() => setSelectedPurchaseType('wav')}
                              className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                            />
                            <span className="text-black font-medium">WAV</span>
                          </div>
                          <span className="text-black font-semibold">
                            {beat.price_wav === 0 ? 'Бесплатно' : `${beat.price_wav.toFixed(0)} ₽`}
                          </span>
                        </label>
                      )}
                      {beat.exclusive_url && (beat.price_exclusive !== null && beat.price_exclusive !== undefined) && (
                        <label className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="format"
                              value="exclusive"
                              checked={selectedPurchaseType === 'exclusive'}
                              onChange={() => setSelectedPurchaseType('exclusive')}
                              className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                            />
                            <span className="text-black font-medium">Exclusive</span>
                          </div>
                          <span className="text-black font-semibold">
                            {beat.price_exclusive === 0 ? 'Бесплатно' : `${beat.price_exclusive.toFixed(0)} ₽`}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                )}
                
                {beat.description && (
                  <div>
                    <span className="text-gray-600 block mb-2">Описание:</span>
                    <p className="text-black">{beat.description}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="card-footer">
              {/* Кнопки покупки/скачивания */}
              {isPurchased ? (
                <div className="space-y-2">
                    {/* Кнопки скачивания для каждого типа */}
                    <div className="flex gap-2">
                      {purchasedTypes.includes('wav') && (
                        <button
                          onClick={() => handleDownload('wav')}
                          className="btn btn-outline btn-sm flex-1 h-9"
                          title="Скачать WAV"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          WAV
                        </button>
                      )}
                      {purchasedTypes.includes('mp3') && (
                        <button
                          onClick={() => handleDownload('mp3')}
                          className="btn btn-outline btn-sm flex-1 h-9"
                          title="Скачать MP3"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          MP3
                        </button>
                      )}
                      {purchasedTypes.includes('exclusive') && (
                        <button
                          onClick={() => handleDownload('exclusive')}
                          className="btn btn-outline btn-sm flex-1 h-9"
                          title="Скачать эксклюзив"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          ZIP
                        </button>
                      )}
                    </div>
                    {/* Кнопка плей - компактная */}
                    <button
                      onClick={async () => {
                        if (isCurrentTrack(beat.id) && isCurrentTrackPlaying(beat.id)) {
                          pauseTrack();
                        } else {
                          const fullUrl = `${API_URL}${beat.demo_url}`;
                          playTrack(beat.id, fullUrl, beat.title);
                        }
                      }}
                      className="btn btn-primary btn-sm w-full h-9"
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
                <div className="flex items-center justify-between gap-3">
                  {/* Слева - текст "Купить в один клик" */}
                  <span 
                    className="text-gray-600 hover:text-black transition-colors text-sm font-medium cursor-pointer" 
                    onClick={handlePurchase}
                  >
                    Купить в один клик
                  </span>
                  
                  {/* Справа - кнопки избранного и корзины */}
                  {isAuthenticated && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleFavorite}
                        className={`h-12 w-12 flex items-center justify-center rounded-full border transition-colors ${
                          isFavorite ? 'text-black border-black bg-gray-50' : 'text-gray-500 border-gray-300 hover:border-black'
                        }`}
                        title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                      >
                        <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      
                      <button
                        onClick={handleAddToCart}
                        className={`h-12 w-12 flex items-center justify-center rounded-full border transition-colors relative ${
                          isInCart ? 'text-black border-black bg-gray-50' : 'text-gray-500 border-gray-300 hover:border-black'
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
        </div>

        {/* Audio Player */}
        <div className="flex flex-col">
          <div className="card flex-1">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-black">Превью</h2>
            </div>
            
            <div className="card-content">
              {beat.demo_url ? (
                <div className="space-y-4">
                  <AudioPlayer src={`${API_URL}${beat.demo_url}`} title={beat.title} trackId={beat.id} />
                  
                  {/* Дополнительные кнопки управления */}
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('BeatPage seek back - currentTime:', currentTime, 'duration:', duration);
                        const newTime = Math.max(0, currentTime - 10);
                        console.log('BeatPage seeking back to:', newTime, 'from:', currentTime);
                        seekTo(newTime);
                      }}
                      disabled={!isCurrentTrack(beat.id)}
                      className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-black flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Назад на 10 секунд"
                    >
                      <span className="text-sm font-medium">-10</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('BeatPage seek forward - currentTime:', currentTime, 'duration:', duration);
                        const newTime = currentTime + 10;
                        console.log('BeatPage seeking forward to:', newTime, 'from:', currentTime);
                        seekTo(newTime);
                      }}
                      disabled={!isCurrentTrack(beat.id)}
                      className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-black flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Вперед на 10 секунд"
                    >
                      <span className="text-sm font-medium">+10</span>
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
      
      <MiniPlayer />
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-20"></div>
    </div>
  );
};

export default BeatPage;
