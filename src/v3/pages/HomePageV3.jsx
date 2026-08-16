import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useCatalog } from '../hooks/useCatalog';
import AudioPlayer from '../components/AudioPlayer';
import BeatCard from '../components/BeatCard';
import { Button, EmptyState, ErrorState, Skeleton, TextInput } from '../components/Primitives';
import { formatTrackCount } from '../format';

export default function HomePageV3() {
  const {
    visible,
    featured,
    genres,
    genre,
    setGenre,
    query,
    setQuery,
    loading,
    error,
    retry,
    favoriteIds,
    cartIds,
    purchasedIds,
    isAuthenticated,
  } = useCatalog();
  const [draft, setDraft] = useState(query);

  const submitSearch = (event) => {
    event.preventDefault();
    setQuery(draft);
  };

  return (
    <div>
      {featured ? (
        <AudioPlayer beat={featured} />
      ) : loading ? (
        <div className="v3-stage">
          <Skeleton className="min-h-[320px]" />
          <div className="v3-stage-copy">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-16 w-2/3" />
          </div>
        </div>
      ) : null}

      <div className="v3-shell v3-catalog" id="catalog">
        <div className="v3-catalog-head">
          <h2>Catalog</h2>
          <p className="v3-count">{loading ? '…' : formatTrackCount(visible.length)}</p>
        </div>

        <form onSubmit={submitSearch} className="v3-search">
          <div className="v3-search-wrap">
            <Search size={14} />
            <TextInput
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search"
              aria-label="Поиск по каталогу"
            />
          </div>
        </form>

        {genres.length > 0 && (
          <div className="v3-tabs">
            <button type="button" className={`v3-tab ${genre === '' ? 'is-on' : ''}`} onClick={() => setGenre('')}>
              All
            </button>
            {genres.map((name) => (
              <button
                key={name}
                type="button"
                className={`v3-tab ${genre === name ? 'is-on' : ''}`}
                onClick={() => setGenre(name === genre ? '' : name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <ErrorState
            title={error}
            action={<Button variant="secondary" onClick={retry}>Повторить</Button>}
          />
        )}

        {loading && (
          <div className="v3-tracks">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-[72px] mb-px" />
            ))}
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <EmptyState
            title="Пока нет треков"
            action={<Link to="/order" className="v3-btn v3-btn-secondary">Заказ</Link>}
          />
        )}

        {!loading && visible.length > 0 && (
          <div className="v3-tracks">
            {visible.map((beat) => (
              <BeatCard
                key={beat.id}
                beat={beat}
                isFavorite={favoriteIds.has(beat.id)}
                isInCart={cartIds.has(beat.id)}
                isPurchased={purchasedIds.has(beat.id)}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
