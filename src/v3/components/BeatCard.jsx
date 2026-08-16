import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Pause, Play, ShoppingCart } from 'lucide-react';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { api, buildMediaUrl } from '../../utils/api';
import { formatPrice, playMeta } from '../format';

export default function BeatCard({
  beat,
  isFavorite = false,
  isInCart = false,
  isPurchased = false,
  isAuthenticated = false,
}) {
  const { playTrack, pauseTrack, resumeTrack, isCurrentTrack, isCurrentTrackPlaying } = useAudioPlayer();
  const [favorite, setFavorite] = useState(isFavorite);
  const [inCart, setInCart] = useState(isInCart);

  useEffect(() => setFavorite(isFavorite), [isFavorite]);
  useEffect(() => setInCart(isInCart), [isInCart]);

  const playing = isCurrentTrackPlaying(beat.id);
  const current = isCurrentTrack(beat.id);
  const cover = beat.cover_url ? buildMediaUrl(beat.cover_url) : null;
  const demo = beat.demo_url ? buildMediaUrl(beat.demo_url) : null;

  const handlePlay = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!demo) return;
    if (current) {
      if (playing) pauseTrack();
      else resumeTrack();
      return;
    }
    playTrack(beat.id, demo, beat.title, cover, playMeta(beat));
  };

  const toggle = async (event, kind) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) return;
    try {
      if (kind === 'fav') {
        if (favorite) await api.delete(`/beats/${beat.id}/favorite`);
        else await api.post(`/beats/${beat.id}/favorite`);
        setFavorite(!favorite);
        window.dispatchEvent(new Event('favoritesUpdated'));
      } else {
        if (inCart) await api.delete(`/beats/${beat.id}/cart`);
        else await api.post(`/beats/${beat.id}/cart`);
        setInCart(!inCart);
        window.dispatchEvent(new Event('cartUpdated'));
      }
    } catch {
      /* keep */
    }
  };

  return (
    <article className={`v3-track ${playing ? 'is-playing' : ''}`}>
      <button type="button" className="v3-icon-btn" onClick={handlePlay} aria-label={playing ? 'Пауза' : 'Слушать'}>
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <Link to={`/beat/${beat.id}`} className="v3-track-art">
        {cover ? <img src={cover} alt={beat.title} loading="lazy" decoding="async" /> : null}
      </Link>
      <Link to={`/beat/${beat.id}`} className="min-w-0">
        <div className="v3-track-title">{beat.title}</div>
        <div className="v3-track-sub">{beat.artist}</div>
      </Link>
      <span className="v3-data v3-meta-hide text-[var(--text-muted)]">{beat.bpm != null ? beat.bpm : '—'}</span>
      <span className="v3-data v3-meta-hide text-[var(--text-muted)]">{beat.key || '—'}</span>
      <span className="v3-data v3-track-price">{formatPrice(beat.price)}</span>
      <div className="v3-track-actions flex justify-end">
        {isPurchased && <span className="v3-label mr-2">В библиотеке</span>}
        {isAuthenticated && (
          <>
            <button
              type="button"
              className={`v3-icon-btn ${favorite ? '!text-[var(--text)]' : ''}`}
              aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
              onClick={(event) => toggle(event, 'fav')}
            >
              <Heart size={15} fill={favorite ? 'currentColor' : 'none'} />
            </button>
            {!isPurchased && (
              <button
                type="button"
                className={`v3-icon-btn ${inCart ? '!text-[var(--text)]' : ''}`}
                aria-label={inCart ? 'Убрать из корзины' : 'В корзину'}
                onClick={(event) => toggle(event, 'cart')}
              >
                <ShoppingCart size={15} />
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
