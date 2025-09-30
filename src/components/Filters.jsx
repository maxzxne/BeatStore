import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Filters = ({ onFilterChange, genres = [] }) => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    genre: '',
    minBpm: '',
    maxBpm: '',
    minPrice: '',
    maxPrice: '',
    key: '',
    purchased: ''
  });

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
    // Не закрываем фильтры при выборе значения
  };

  const clearFilters = () => {
    const emptyFilters = {
      genre: '',
      minBpm: '',
      maxBpm: '',
      minPrice: '',
      maxPrice: '',
      key: '',
      purchased: ''
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline btn-sm mb-4"
      >
        <Filter className="h-4 w-4 mr-2" />
        Фильтры
        {hasActiveFilters && (
          <span className="ml-2 bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
            {Object.values(filters).filter(v => v !== '').length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">Фильтры</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Очистить все
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Genre */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Жанр
              </label>
              <select
                value={filters.genre}
                onChange={(e) => handleFilterChange('genre', e.target.value)}
                className="input"
              >
                <option value="">Все жанры</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            {/* Key */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Тональность
              </label>
              <select
                value={filters.key}
                onChange={(e) => handleFilterChange('key', e.target.value)}
                className="input"
              >
                <option value="">Все тональности</option>
                {keys.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            {/* BPM Range */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Диапазон BPM
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Мин"
                  value={filters.minBpm}
                  onChange={(e) => handleFilterChange('minBpm', e.target.value)}
                  className="input flex-1"
                />
                <input
                  type="number"
                  placeholder="Макс"
                  value={filters.maxBpm}
                  onChange={(e) => handleFilterChange('maxBpm', e.target.value)}
                  className="input flex-1"
                />
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Диапазон цен
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Мин ₽"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="input flex-1"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Макс ₽"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="input flex-1"
                />
              </div>
            </div>

            {/* Purchase Status - only show if authenticated */}
            {isAuthenticated && (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Статус покупки
                </label>
                <select
                  value={filters.purchased}
                  onChange={(e) => handleFilterChange('purchased', e.target.value)}
                  className="input"
                >
                  <option value="">Все биты</option>
                  <option value="purchased">Купленные</option>
                  <option value="not_purchased">Не купленные</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Filters;
