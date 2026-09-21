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
import { checkoutErrorMessage, startCheckout, withPromo } from '../utils/checkout';
import {
  beatHasDeliverableFile,
  beatLicenseOptions,
  buyButtonLabel,
  resolveBeatPayAmount,
} from '../utils/beatPricing';
import { licensePriceText, PromoCodeField } from './DiscountUi';
import { loginPath } from '../utils/authRedirect';
import { addGuestBeat, isInGuestCart, removeGuestBeat } from '../utils/guestCart';
import { Heart, ShoppingCart, Download, ArrowLeft, Check, Play, Pause } from 'lucide-react';

/**
 * Компонент страницы бита
 * @returns {JSX.Element} JSX элемент страницы бита
 */
const BeatPageV2 = () => {
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
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    fetchBeat();
  }, [id]);

  useEffect(() => {
    if (!beat) return;
    const opts = beatLicenseOptions(beat);
    if (!opts.length) return;
    if (!opts.some((o) => o.type === selectedPurchaseType)) {
      setSelectedPurchaseType(opts[0].type);
    }
  }, [beat]);

  useEffect(() => {
    if (!isAuthenticated && id) {
      setIsInCart(isInGuestCart('beat', id));
    }
  }, [id, isAuthenticated, selectedPurchaseType]);

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
    if (!isAuthenticated) {
      navigate(loginPath(`/beat/${id}`));
      return;
    }
    
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
    if (isPurchased) return;
    if (!isAuthenticated) {
      if (isInCart) {
        removeGuestBeat(id);
        setIsInCart(false);
        showSuccess('Удалено из корзины');
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        addGuestBeat(id, selectedPurchaseType);
        setIsInCart(true);
        showSuccess('Добавлено в корзину — войди, чтобы оформить');
        window.dispatchEvent(new Event('cartUpdated'));
      }
      return;
    }

    try {
      if (isInCart) {
        await api.delete(`/beats/${id}/cart`);
      } else {
        await api.post(`/beats/${id}/cart`);
      }
      setIsInCart(!isInCart);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error toggling cart:', error);
      showError('Не удалось обновить корзину');
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      navigate(loginPath(`/beat/${id}`));
      return;
    }

    const actualPrice = resolveBeatPayAmount(beat, selectedPurchaseType);

    try {
      if (!actualPrice) {
        const formData = new FormData();
        formData.append('purchase_type', selectedPurchaseType);
        await api.post(`/beats/${id}/purchase`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showSuccess('Бит добавлен в покупки');
        await checkBeatStatus();
        return;
      }
      await startCheckout(withPromo({
        kind: 'beat',
        item_id: Number(id),
        purchase_type: selectedPurchaseType,
      }, promoCode));
    } catch (error) {
      showError(checkoutErrorMessage(error));
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

  const playing = beat && isCurrentTrack(beat.id) && isCurrentTrackPlaying(beat.id);
  const licenseBtn = (active) =>
    `px-4 h-11 rounded-full text-sm font-medium transition-colors ${
      active ? 'bg-[#22c55e] text-[#052e16]' : 'bg-white/5 text-white/70 hover:bg-white/10'
    }`;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-white/50">Загрузка бита...</div>
    );
  }

  if (!beat) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-white/50">Бит не найден</div>
    );
  }

  const licenseOptions = beatLicenseOptions(beat);
  const selectedPay = resolveBeatPayAmount(beat, selectedPurchaseType);
  const hasFile = beatHasDeliverableFile(beat);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-8 inline-flex cursor-pointer items-center border-none bg-transparent p-0 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад
      </button>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          {beat.cover_url ? (
            <img src={buildMediaUrl(beat.cover_url)} alt={beat.title} className={`h-full w-full object-cover ${playing ? 'v2-spin' : ''}`} />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-neutral-900 to-black">
              <Play className="h-16 w-16 text-white/20" />
            </div>
          )}
          {beat.demo_url && (
            <button
              type="button"
              onClick={() => {
                if (playing) pauseTrack();
                else playTrack(beat.id, buildMediaUrl(beat.demo_url), beat.title, beat.cover_url ? buildMediaUrl(beat.cover_url) : null);
              }}
              className="absolute inset-0 grid cursor-pointer place-items-center bg-black/25"
              aria-label={playing ? 'Пауза' : 'Слушать'}
            >
              <span className="grid h-20 w-20 place-items-center rounded-full bg-[#22c55e] text-[#052e16] shadow-[0_0_40px_rgba(34,197,94,0.55)]">
                {playing ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
              </span>
            </button>
          )}
        </div>

        <div className="v2-reveal space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#22c55e]">{beat.genre}</p>
            <h1 className="mt-2 font-[Syne] text-4xl font-extrabold tracking-tight">{beat.title}</h1>
            <p className="mt-2 text-white/50">{beat.artist}</p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-white/60">
            <span className="rounded-full border border-white/10 px-3 py-1">{beat.bpm} BPM</span>
            {beat.key && <span className="rounded-full border border-white/10 px-3 py-1">{beat.key}</span>}
          </div>

          {licenseOptions.length > 0 && (
            <div>
              <p className="mb-3 text-sm text-white/50">Лицензия</p>
              <div className="flex flex-wrap gap-2">
                {licenseOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedPurchaseType(opt.type)}
                    className={licenseBtn(selectedPurchaseType === opt.type)}
                  >
                    {opt.label} · {licensePriceText(opt.amount, opt.was)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {beat.description && <p className="text-sm leading-relaxed text-white/70">{beat.description}</p>}

          {!hasFile && !isPurchased && (
            <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
              Файл лицензии ещё не загружен. Можно оформить — доступ появится, как только админ добавит файл.
            </p>
          )}

          {isPurchased ? (
            <div className="flex flex-wrap items-center gap-3">
              {purchasedTypes.map((t) => (
                <button key={t} type="button" onClick={() => handleDownload(t)} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 text-sm hover:bg-white/5">
                  <Download className="h-4 w-4" /> {t.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedPay > 0 && (
                <PromoCodeField value={promoCode} onChange={setPromoCode} className="max-w-xs" />
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePurchase}
                  className="h-12 cursor-pointer rounded-full bg-[#22c55e] px-6 font-semibold text-[#052e16] transition hover:brightness-110"
                >
                  {buyButtonLabel(selectedPay)}
                </button>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleFavorite}
                    className="grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-white/15 hover:bg-white/5"
                    aria-label="Избранное"
                  >
                    <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-white/15 hover:bg-white/5"
                  aria-label={isInCart ? 'Убрать из корзины' : 'В корзину'}
                >
                  {isInCart ? <Check className="h-5 w-5 text-[#22c55e]" /> : <ShoppingCart className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BeatPageV2;


