/**
 * Компонент мини-плеера
 * 
 * Отображается внизу страницы и позволяет управлять воспроизведением
 * без перехода на страницу бита. Включает:
 * - Кнопки воспроизведения/паузы
 * - Перемотку на -10/+10 секунд
 * - Контроль громкости
 * - Прогресс-бар
 * - Кнопку закрытия
 */

import React from 'react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { Play, Pause, Volume2, VolumeX, X, SkipBack, SkipForward } from 'lucide-react';

/**
 * Компонент мини-плеера
 * @returns {JSX.Element|null} JSX элемент мини-плеера или null если нет активного трека
 */
const MiniPlayer = () => {
  // Получаем состояние и функции из контекста аудио плеера
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

  // Показываем плеер только если есть активный трек
  if (!currentTrack || !currentTrackTitle) {
    return null;
  }

  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  const handleSeek = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentTrack || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    seekTo(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleClose = () => {
    stopTrack();
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-300 dark:border-neutral-800 px-4 py-3 z-[60] safe-area-bottom shadow-lg transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Слева: обложка + название */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-neutral-800 flex-shrink-0">
            {currentTrackCover ? (
              <img src={currentTrackCover} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="h-5 w-5 text-gray-400 dark:text-neutral-500" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-black dark:text-white truncate">{currentTrackTitle}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div
                className="flex-1 h-1 bg-gray-200 dark:bg-neutral-700 rounded-full cursor-pointer max-w-[120px]"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-black dark:bg-white rounded-full transition-all"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-neutral-400 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Центр: кнопки управления */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.preventDefault(); seekTo(Math.max(0, currentTime - 10)); }}
            disabled={!currentTrack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            title="Назад на 10 сек"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            onClick={handleTogglePlay}
            className="w-12 h-12 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200 transition-colors shadow-md"
            aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); seekTo(Math.min(duration || 0, currentTime + 10)); }}
            disabled={!currentTrack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            title="Вперёд на 10 сек"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        {/* Справа: громкость + закрыть */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleMute}
            className="text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white p-1"
            aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-gray-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black dark:[&::-moz-range-thumb]:bg-white"
          />
          <button
            onClick={handleClose}
            className="text-gray-600 dark:text-neutral-400 hover:text-red-500 p-1 transition-colors"
            title="Закрыть"
            aria-label="Закрыть плеер"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
