import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BeatCardV2 from '../v2/BeatCardV2';
import { api } from '../utils/api';
import { Heart } from 'lucide-react';

const FavoritesPage = () => {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [purchasedBeats, setPurchasedBeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
      fetchPurchasedBeats();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await api.get('/favorites');
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchasedBeats = async () => {
    try {
      const response = await api.get('/purchases');
      setPurchasedBeats(response.data);
    } catch (error) {
      console.error('Error fetching purchased beats:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <Heart className="mx-auto mb-4 h-12 w-12 text-white/30" />
          <h1 className="font-[Syne] text-2xl font-extrabold text-white">Войдите, чтобы просмотреть избранное</h1>
          <p className="mt-2 text-sm text-white/50">Вам нужно войти в систему, чтобы увидеть избранные биты.</p>
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
          <div className="text-sm text-white/50">Загрузка избранного...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Saved</p>
        <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Избранное</h1>
        <p className="mt-2 text-sm text-white/50">
          {favorites.length} избранных битов
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <Heart className="mx-auto mb-4 h-12 w-12 text-white/30" />
          <div className="font-[Syne] text-xl font-bold text-white">Пока нет избранных</div>
          <p className="mt-2 text-sm text-white/50">
            Начните добавлять биты в избранное, чтобы увидеть их здесь
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
          >
            Смотреть биты
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map((beat, i) => {
            const isPurchased = purchasedBeats.some(purchasedBeat => purchasedBeat.id === beat.id);
            return (
              <BeatCardV2
                key={beat.id}
                beat={beat}
                isPurchased={isPurchased}
                delay={i * 40}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
