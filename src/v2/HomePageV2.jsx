import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search } from 'lucide-react';
import BeatCardV2 from './BeatCardV2';
import Filters from '../components/Filters';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { api } from '../utils/api';

const HomePageV2 = () => {
  const { isAuthenticated } = useAuth();
  const { canSeeCourses } = useSiteSettings();
  const [beats, setBeats] = useState([]);
  const [genres, setGenres] = useState([]);
  const [purchasedBeats, setPurchasedBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get('search') || '');

  useEffect(() => {
    fetchBeats();
    fetchGenres();
    if (isAuthenticated) fetchPurchasedBeats();
  }, [filters, searchParams, isAuthenticated]);

  const fetchBeats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/beats?${params.toString()}`);
      let filteredBeats = Array.isArray(response.data) ? response.data : [];
      const search = searchParams.get('search');
      if (search) {
        filteredBeats = filteredBeats.filter((beat) =>
          beat.title.toLowerCase().includes(search.toLowerCase()) ||
          beat.artist.toLowerCase().includes(search.toLowerCase()) ||
          beat.genre.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (filters.purchased === 'purchased') {
        const ids = purchasedBeats.map((b) => b.id);
        filteredBeats = filteredBeats.filter((b) => ids.includes(b.id));
      } else if (filters.purchased === 'not_purchased') {
        const ids = purchasedBeats.map((b) => b.id);
        filteredBeats = filteredBeats.filter((b) => !ids.includes(b.id));
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
      if (Array.isArray(response.data)) {
        setGenres([...new Set(response.data.map((beat) => beat.genre))]);
      }
    } catch {
      setGenres([]);
    }
  };

  const fetchPurchasedBeats = async () => {
    try {
      const response = await api.get('/purchases');
      setPurchasedBeats(response.data);
    } catch {
      /* ignore */
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (query.trim()) next.set('search', query.trim());
    else next.delete('search');
    setSearchParams(next);
  };

  const filtersActive = Object.values(filters).some((value) => value);

  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-6 pt-8 sm:pt-14">
        <div className="mx-auto max-w-6xl">
          <p className="v2-reveal text-xs uppercase tracking-[0.3em] text-[#22c55e]">Marketplace</p>
          <h1 className="v2-reveal mt-3 max-w-3xl font-[Syne] text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl" style={{ animationDelay: '80ms' }}>
            Инструменталы.<br />Чёрный экран.<br />Зелёный удар.
          </h1>
          <p className="v2-reveal mt-5 max-w-xl text-sm text-white/50 sm:text-base" style={{ animationDelay: '140ms' }}>
            Каталог битов, заказы под ключ{canSeeCourses ? ' и курсы по битмейкингу' : ''}. Слушай демо, бери лицензию, работай дальше.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-12">
        <div className="v2-toolbar v2-reveal mb-4">
          <form onSubmit={submitSearch} className="v2-search" role="search">
            <Search className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию, артисту, жанру"
              className="v2-search-input"
              aria-label="Поиск по названию, артисту, жанру"
            />
          </form>
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={`v2-filter-btn ${filtersOpen || filtersActive ? 'is-on' : ''}`}
            aria-expanded={filtersOpen}
            aria-controls="v2-beat-filters"
          >
            <Filter className="h-4 w-4" />
            Фильтры
          </button>
        </div>

        <p className="mb-4 text-sm text-white/50">{loading ? 'Загрузка...' : `${beats.length} треков`}</p>

        <div id="v2-beat-filters" className="v2-filters">
          <Filters
            onFilterChange={setFilters}
            genres={genres}
            currentFilters={filters}
            isOpen={filtersOpen}
            onToggle={setFiltersOpen}
            hideTrigger
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-3xl bg-white/5" />
            ))}
          </div>
        ) : beats.length === 0 ? (
          <div className="py-16 text-center text-white/50">Биты не найдены</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {beats.map((beat, i) => (
              <BeatCardV2
                key={beat.id}
                beat={beat}
                isPurchased={purchasedBeats.some((p) => p.id === beat.id)}
                delay={i * 40}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePageV2;
