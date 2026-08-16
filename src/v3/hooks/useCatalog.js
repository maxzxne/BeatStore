import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

export function useCatalog() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [cartIds, setCartIds] = useState(() => new Set());
  const [purchasedIds, setPurchasedIds] = useState(() => new Set());
  const [genre, setGenre] = useState('');
  const query = searchParams.get('search') || '';

  const loadBeats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/beats');
      setBeats(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Не удалось загрузить каталог');
      setBeats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      setCartIds(new Set());
      setPurchasedIds(new Set());
      return;
    }
    try {
      const [fav, cart, purchases] = await Promise.all([
        api.get('/favorites'),
        api.get('/cart'),
        api.get('/purchases'),
      ]);
      setFavoriteIds(new Set((fav.data || []).map((item) => item.id)));
      setCartIds(new Set((cart.data || []).map((item) => item.id)));
      setPurchasedIds(new Set((purchases.data || []).map((item) => item.id)));
    } catch {
      /* status is optional for guests */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadBeats();
  }, [loadBeats]);

  useEffect(() => {
    loadStatus();
    const refresh = () => loadStatus();
    window.addEventListener('favoritesUpdated', refresh);
    window.addEventListener('cartUpdated', refresh);
    return () => {
      window.removeEventListener('favoritesUpdated', refresh);
      window.removeEventListener('cartUpdated', refresh);
    };
  }, [loadStatus]);

  const genres = useMemo(
    () => [...new Set(beats.map((beat) => beat.genre).filter(Boolean))],
    [beats]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return beats.filter((beat) => {
      if (genre && beat.genre !== genre) return false;
      if (!needle) return true;
      return [beat.title, beat.artist, beat.genre].some((value) =>
        String(value || '').toLowerCase().includes(needle)
      );
    });
  }, [beats, genre, query]);

  const featured = useMemo(
    () => visible.find((beat) => beat.demo_url) || beats.find((beat) => beat.demo_url) || beats[0] || null,
    [visible, beats]
  );

  const setQuery = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('search', value.trim());
    else next.delete('search');
    setSearchParams(next, { replace: true });
  };

  return {
    beats,
    visible,
    featured,
    genres,
    genre,
    setGenre,
    query,
    setQuery,
    loading,
    error,
    retry: loadBeats,
    favoriteIds,
    cartIds,
    purchasedIds,
    isAuthenticated,
  };
}
