/**
 * Компонент мини-плеера
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { Play, Pause, Volume2, VolumeX, X, SkipBack, SkipForward } from 'lucide-react';

const MiniPlayer = () => {
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
    setVolume,
    toggleMute,
    stopTrack
  } = useAudioPlayer();

  const handleTogglePlay = () => {
    if (isPlaying) pauseTrack();
    else resumeTrack();
  };

  const handleSeek = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentTrack || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    seekTo((clickX / rect.width) * duration);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTrack || !currentTrackTitle) {
    return null;
  }

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  const playerContent = (
    <div
      className="bg-white dark:bg-neutral-900 border-t border-gray-300 dark:border-neutral-800 safe-area-bottom shadow-lg transition-colors"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      {/* Mobile progress */}
      <div className="md:hidden px-3 pt-2">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={duration ? currentTime : 0}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          className="mini-player-range w-full cursor-pointer"
          aria-label="Прогресс"
        />
      </div>

      <div className="max-w-6xl mx-auto px-3 py-2.5 md:px-4 md:py-3">
        {/* Mobile layout */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 dark:bg-neutral-700 flex-shrink-0">
            {currentTrackCover ? (
              <img src={currentTrackCover} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-black dark:text-white truncate leading-tight">
              {currentTrackTitle}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-neutral-400 tabular-nums leading-tight mt-0.5">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => { e.preventDefault(); seekTo(Math.max(0, currentTime - 10)); }}
              className="w-9 h-9 inline-flex items-center justify-center text-gray-600 dark:text-neutral-400"
              title="Назад 10 сек"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={handleTogglePlay}
              className="w-10 h-10 rounded-full bg-black dark:bg-white inline-flex items-center justify-center text-white dark:text-black"
              aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); seekTo(Math.min(duration || 0, currentTime + 10)); }}
              className="w-9 h-9 inline-flex items-center justify-center text-gray-600 dark:text-neutral-400"
              title="Вперёд 10 сек"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              onClick={toggleMute}
              className="w-9 h-9 inline-flex items-center justify-center text-gray-600 dark:text-neutral-400"
              aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={stopTrack}
              className="w-9 h-9 inline-flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-red-500"
              aria-label="Закрыть плеер"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
            <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-200 dark:bg-neutral-700 flex-shrink-0 ring-1 ring-gray-200 dark:ring-neutral-600">
              {currentTrackCover ? (
                <img src={currentTrackCover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-neutral-800">
                  <Play className="h-6 w-6 text-gray-400 dark:text-neutral-500" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-black dark:text-white truncate">{currentTrackTitle}</div>
              <div className="text-xs text-gray-500 dark:text-neutral-400 tabular-nums mt-0.5">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 items-center px-2 flex">
            <div
              className="flex-1 h-2 bg-gray-200 dark:bg-neutral-700 rounded-full cursor-pointer overflow-hidden"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-black dark:bg-white rounded-full transition-all min-w-0"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => { e.preventDefault(); seekTo(Math.max(0, currentTime - 10)); }}
              className="w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800"
              title="Назад на 10 сек"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={handleTogglePlay}
              className="w-11 h-11 rounded-full bg-black dark:bg-white inline-flex items-center justify-center text-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200 shadow-md"
              aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); seekTo(Math.min(duration || 0, currentTime + 10)); }}
              className="w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800"
              title="Вперёд на 10 сек"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-neutral-600 mx-1" />
            <button
              onClick={toggleMute}
              className="w-8 h-8 inline-flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="mini-player-range w-20"
              aria-label="Громкость"
            />
            <button
              onClick={stopTrack}
              className="w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-neutral-800 ml-1"
              aria-label="Закрыть плеер"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(playerContent, document.body);
};

export default MiniPlayer;
