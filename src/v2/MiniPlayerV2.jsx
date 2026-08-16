import React from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Volume2, VolumeX, X, SkipBack, SkipForward } from 'lucide-react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const MiniPlayerV2 = () => {
  const {
    currentTrack,
    currentTrackTitle,
    currentTrackCover,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    pauseTrack,
    resumeTrack,
    seekTo,
    toggleMute,
    stopTrack,
  } = useAudioPlayer();

  if (!currentTrack || !currentTrackTitle) return null;

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return createPortal(
    <div
      className="safe-area-bottom"
      style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9999 }}
    >
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b16]/85 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
        <div className="h-1 bg-white/10">
          <div className="h-full bg-[#22c55e] transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 md:px-4">
          <div className={`relative h-12 w-12 overflow-hidden rounded-xl bg-white/10 ${isPlaying ? 'v2-spin' : ''}`}>
            {currentTrackCover ? (
              <img src={currentTrackCover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-white/40">
                <Play className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{currentTrackTitle}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums text-white/50">
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              {isPlaying && (
                <span className="v2-eq inline-flex h-3 items-end gap-0.5" aria-hidden>
                  <span className="h-3" /><span className="h-3" /><span className="h-3" /><span className="h-3" /><span className="h-3" />
                </span>
              )}
            </div>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={duration ? currentTime : 0}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="v2-range mt-2 hidden w-full md:block"
              aria-label="Прогресс"
            />
          </div>

          <div className="flex items-center gap-0.5">
            <button type="button" className="grid h-10 w-10 place-items-center text-white/70 hover:text-white" onClick={() => seekTo(Math.max(0, currentTime - 10))} aria-label="Назад 10 сек">
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => (isPlaying ? pauseTrack() : resumeTrack())}
              className="grid h-11 w-11 place-items-center rounded-full bg-[#22c55e] text-[#0f172a] shadow-[0_0_24px_rgba(34,197,94,0.45)]"
              aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
            <button type="button" className="grid h-10 w-10 place-items-center text-white/70 hover:text-white" onClick={() => seekTo(Math.min(duration || 0, currentTime + 10))} aria-label="Вперёд 10 сек">
              <SkipForward className="h-4 w-4" />
            </button>
            <button type="button" className="hidden md:grid h-10 w-10 place-items-center text-white/70 hover:text-white" onClick={toggleMute} aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}>
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button type="button" className="grid h-10 w-10 place-items-center text-white/70 hover:text-red-400" onClick={stopTrack} aria-label="Закрыть плеер">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="px-3 pb-2 md:hidden">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={duration ? currentTime : 0}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="v2-range w-full"
            aria-label="Прогресс"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MiniPlayerV2;
