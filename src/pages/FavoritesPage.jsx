import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BeatCard from '../components/BeatCard';
import MiniPlayer from '../components/MiniPlayer';
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
          <Heart className="h-16 w-16 text-dark-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Sign in to view favorites</h1>
          <p className="text-dark-400">You need to be logged in to see your favorite beats.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Загрузка избранного...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Избранное</h1>
        <p className="text-dark-400">
          {favorites.length} избранных битов
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-dark-400 mx-auto mb-4" />
          <div className="text-dark-400 text-lg">No favorites yet</div>
          <p className="text-dark-500 mt-2">
            Start adding beats to your favorites to see them here
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
      
      <MiniPlayer />
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-20"></div>
    </div>
  );
};

export default FavoritesPage;
