/**
 * Главная страница приложения - каталог битов
 * 
 * Функциональность:
 * - Отображение списка всех доступных битов
 * - Фильтрация по жанру, тональности, BPM, цене
 * - Поиск по названию, исполнителю, жанру
 * - Отображение статуса покупки для авторизованных пользователей
 * - Интеграция с глобальным аудио плеером
 * - Мини-плеер внизу страницы
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BeatCard from '../components/BeatCard';
import Filters from '../components/Filters';
import MiniPlayer from '../components/MiniPlayer';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

/**
 * Компонент главной страницы
 * @returns {JSX.Element} JSX элемент главной страницы
 */
const HomePage = () => {
  // Контекст аутентификации
  const { isAuthenticated } = useAuth();
  
  // Состояние списка битов
  const [beats, setBeats] = useState([]);
  // Состояние списка жанров для фильтров
  const [genres, setGenres] = useState([]);
  // Состояние купленных битов (для отображения статуса)
  const [purchasedBeats, setPurchasedBeats] = useState([]);
  // Состояние загрузки
  const [loading, setLoading] = useState(true);
  // Параметры поиска из URL
  const [searchParams, setSearchParams] = useSearchParams();
  // Состояние фильтров
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchBeats();
    fetchGenres();
    if (isAuthenticated) {
      fetchPurchasedBeats();
    }
  }, [filters, searchParams, isAuthenticated]);

  const fetchBeats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add search query
      const search = searchParams.get('search');
      if (search) {
        // For now, we'll filter client-side since the API doesn't have search
        // In a real app, you'd add search to the API
      }
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await api.get(`/beats?${params.toString()}`);
      let filteredBeats = response.data;
      
      // Client-side search filter
      if (search) {
        filteredBeats = filteredBeats.filter(beat =>
          beat.title.toLowerCase().includes(search.toLowerCase()) ||
          beat.artist.toLowerCase().includes(search.toLowerCase()) ||
          beat.genre.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Filter by purchase status
      if (filters.purchased === 'purchased') {
        const purchasedIds = purchasedBeats.map(beat => beat.id);
        filteredBeats = filteredBeats.filter(beat => purchasedIds.includes(beat.id));
      } else if (filters.purchased === 'not_purchased') {
        const purchasedIds = purchasedBeats.map(beat => beat.id);
        filteredBeats = filteredBeats.filter(beat => !purchasedIds.includes(beat.id));
      }
      
      setBeats(filteredBeats);
    } catch (error) {
      console.error('Error fetching beats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const response = await api.get('/beats');
      const uniqueGenres = [...new Set(response.data.map(beat => beat.genre))];
      setGenres(uniqueGenres);
    } catch (error) {
      console.error('Error fetching genres:', error);
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Загрузка битов...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Биты</h1>
        <p className="text-gray-600">
          {beats.length} битов доступно
        </p>
      </div>

      <Filters onFilterChange={handleFilterChange} genres={genres} currentFilters={filters} />

      {beats.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-600 text-lg">Биты не найдены</div>
          <p className="text-gray-500 mt-2">
            Попробуйте изменить фильтры
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {beats.map(beat => {
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

export default HomePage;
