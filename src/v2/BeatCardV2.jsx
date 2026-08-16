import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { api, buildMediaUrl } from '../utils/api';

const BeatCardV2 = ({ beat, isPurchased = false, delay = 0 }) => {
  const { isAuthenticated } = useAuth();
  const { playTrack, isCurrentTrackPlaying } = useAudioPlayer();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInCart, setIsInCart] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !beat.id) return;
    Promise.all([api.get('/favorites'), api.get('/cart')])
      .then(([fav, cart]) => {
        setIsFavorite(fav.data?.some((f) => f.id === beat.id));
        setIsInCart(cart.data?.some((c) => c.id === beat.id));
      })
      .catch(() => {});
  }, [isAuthenticated, beat.id]);

  const handlePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!beat.demo_url) return;
    playTrack(beat.id, buildMediaUrl(beat.demo_url), beat.title, beat.cover_url ? buildMediaUrl(beat.cover_url) : null);
  };

  const toggle = async (e, kind) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    try {
      if (kind === 'fav') {
        if (isFavorite) await api.delete(`/beats/${beat.id}/favorite`);
        else await api.post(`/beats/${beat.id}/favorite`);
        setIsFavorite(!isFavorite);
        window.dispatchEvent(new Event('favoritesUpdated'));
      } else {
        if (isInCart) await api.delete(`/beats/${beat.id}/cart`);
        else await api.post(`/beats/${beat.id}/cart`);
        setIsInCart(!isInCart);
        window.dispatchEvent(new Event('cartUpdated'));
      }
    } catch {
      /* ignore */
    }
  };

  const playing = isCurrentTrackPlaying(beat.id);
  const price = beat.price === 0 ? 'Free' : `${beat.price?.toFixed?.(0) ?? beat.price} ₽`;

  return (
    <Link
      to={`/beat/${beat.id}`}
      className="v2-reveal group block"
      style={{ animationDelay: `${delay}ms` }}
    >
      <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition-transform duration-300 hover:-translate-y-1 hover:border-[#22c55e]/40 hover:shadow-[0_20px_60px_rgba(34,197,94,0.12)]">
        <div className="relative aspect-square overflow-hidden">
          {beat.cover_url ? (
            <img
              src={buildMediaUrl(beat.cover_url)}
              alt={beat.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-indigo-950 to-black font-[Syne] text-white/30">
              XW
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
          <button
            type="button"
            onClick={handlePlay}
            className="absolute inset-0 grid place-items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            aria-label={playing ? 'Пауза' : 'Слушать'}
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#22c55e] text-[#0f172a] shadow-[0_0_30px_rgba(34,197,94,0.55)]">
              {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </span>
          </button>
          {isPurchased && (
            <span className="absolute top-3 left-3 rounded-full bg-[#22c55e] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f172a]">
              Куплено
            </span>
          )}
          {playing && (
            <span className="v2-eq absolute top-3 right-3 inline-flex h-4 items-end gap-0.5">
              <span className="h-4" /><span className="h-4" /><span className="h-4" /><span className="h-4" />
            </span>
          )}
        </div>
        <div className="space-y-2 p-4">
          <h3 className="truncate font-[Syne] text-base font-bold">{beat.title}</h3>
          <p className="truncate text-sm text-white/50">{beat.artist}</p>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/40">
            <span>{beat.genre}</span>
            <span>·</span>
            <span>{beat.bpm} BPM</span>
            {beat.key && <><span>·</span><span>{beat.key}</span></>}
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-semibold text-[#22c55e]">{price}</span>
            {isAuthenticated && (
              <div className="flex gap-1">
                <button type="button" onClick={(e) => toggle(e, 'fav')} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Избранное">
                  <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                {!isPurchased && (
                  <button type="button" onClick={(e) => toggle(e, 'cart')} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Корзина">
                    <ShoppingCart className="h-4 w-4" fill={isInCart ? 'currentColor' : 'none'} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
};

export default BeatCardV2;
