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
import { createPortal } from 'react-dom';
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

  if (!currentTrack || !currentTrackTitle) {
    return null;
  }

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
      {/* Прогресс-бар — верхняя граница плеера на всю ширину, только на мобиле */}
      <div className="md:hidden absolute left-0 right-0 top-0 h-4 flex items-center px-0 touch-none">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={duration ? currentTime : 0}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200 dark:[&::-webkit-slider-runnable-track]:bg-neutral-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:-mt-1.25 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-gray-200 dark:[&::-moz-range-track]:bg-neutral-700 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black dark:[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4 pb-3 md:pt-3">
        <div className="flex items-center gap-3 md:gap-6">
          {/* Слева: обложка + название — только на десктопе */}
          <div className="hidden md:flex items-center gap-4 min-w-0 flex-shrink-0">
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

          {/* Центр: прогресс-бар — только на десктопе */}
          <div className="hidden md:flex flex-1 min-w-0 items-center px-2">
            <div
              className="flex-1 h-2 bg-gray-200 dark:bg-neutral-700 rounded-full cursor-pointer overflow-hidden"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-black dark:bg-white rounded-full transition-all min-w-0"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Контролы + громкость */}
          <div className="flex-1 md:flex-initial flex items-center justify-center md:justify-end gap-2 flex-shrink-0">
            <button
              onClick={(e) => { e.preventDefault(); seekTo(Math.max(0, currentTime - 10)); }}
              disabled={!currentTrack}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              title="Назад на 10 сек"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={handleTogglePlay}
              className="w-11 h-11 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200 transition-colors shadow-md flex-shrink-0"
              aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); seekTo(Math.min(duration || 0, currentTime + 10)); }}
              disabled={!currentTrack}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              title="Вперёд на 10 сек"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-neutral-600 mx-1" />
            <button
              onClick={toggleMute}
              className="text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white p-1"
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
              className="w-12 md:w-16 h-1 bg-gray-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black dark:[&::-moz-range-thumb]:bg-white"
            />
          </div>

          {/* Крестик — отдельно справа */}
          <button
            onClick={handleClose}
            className="ml-auto md:ml-2 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-600 dark:text-neutral-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="Закрыть"
            aria-label="Закрыть плеер"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(playerContent, document.body);
};

export default MiniPlayer;
