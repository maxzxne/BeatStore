import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BeatCard from '../components/BeatCard';
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
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Войдите, чтобы просмотреть избранное</h1>
          <p className="text-gray-600 dark:text-neutral-400">Вам нужно войти в систему, чтобы увидеть избранные биты.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-neutral-400">Загрузка избранного...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Избранное</h1>
        <p className="text-gray-600 dark:text-neutral-400">
          {favorites.length} избранных битов
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600 dark:text-neutral-400 text-lg">Пока нет избранных</div>
          <p className="text-gray-500 dark:text-neutral-500 mt-2">
            Начните добавлять биты в избранное, чтобы увидеть их здесь
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map(beat => {
            const isPurchased = purchasedBeats.some(purchasedBeat => purchasedBeat.id === beat.id);
            return (
              <BeatCard 
                key={beat.id} 
                beat={beat} 
                isPurchased={isPurchased}
                onUpdate={fetchPurchasedBeats}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;


