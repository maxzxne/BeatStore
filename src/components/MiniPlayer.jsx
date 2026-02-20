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
import { Play, Pause, Volume2, VolumeX, X } from 'lucide-react';

/**
 * Компонент мини-плеера
 * @returns {JSX.Element|null} JSX элемент мини-плеера или null если нет активного трека
 */
const MiniPlayer = () => {
  // Получаем состояние и функции из контекста аудио плеера
  const { 
    currentTrack, 
    currentTrackTitle,
    isPlaying, 
    currentTime, 
    duration, 
    volume, 
    isMuted,
    playTrack, 
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
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-300 dark:border-neutral-800 p-3 sm:p-4 z-[60] safe-area-bottom shadow-lg transition-colors">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={handleTogglePlay}
            className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-neutral-200 rounded-full p-2 sm:p-2.5 transition-colors flex-shrink-0"
            aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 sm:h-5 sm:w-5 text-white dark:text-black" />
            ) : (
              <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white dark:text-black" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm text-black dark:text-white mb-1 sm:mb-2 truncate">{currentTrackTitle}</div>
            <div className="space-y-1 sm:space-y-2">
              {/* Прогресс-бар на отдельной строке */}
              <div
                className="w-full h-1.5 sm:h-2 bg-gray-300 dark:bg-neutral-700 rounded-full cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-black dark:bg-white rounded-full transition-all"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              {/* Время на отдельной строке */}
              <div className="flex justify-between text-xs text-gray-600 dark:text-neutral-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
          
          {/* Seek buttons - скрываем на мобильных */}
          <div className="hidden sm:flex items-center space-x-1">
                   <button
                     onClick={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       const newTime = Math.max(0, currentTime - 10);
                       seekTo(newTime);
                     }}
                     disabled={!currentTrack}
                     className="w-8 h-8 rounded-full border border-gray-300 dark:border-neutral-700 hover:border-black dark:hover:border-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white"
                     title="Назад на 10 секунд"
                   >
                     <span className="text-xs font-medium">-10</span>
                   </button>
                   <button
                     onClick={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       const newTime = currentTime + 10;
                       seekTo(newTime);
                     }}
                     disabled={!currentTrack}
                     className="w-8 h-8 rounded-full border border-gray-300 dark:border-neutral-700 hover:border-black dark:hover:border-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white"
                     title="Вперед на 10 секунд"
                   >
                     <span className="text-xs font-medium">+10</span>
                   </button>
                 </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* Громкость - скрываем на мобильных */}
            <div className="hidden sm:flex items-center space-x-2">
            <button onClick={toggleMute} className="text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white">
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-gray-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black dark:[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
            />
            </div>
            <button 
              onClick={handleClose} 
              className="text-gray-600 dark:text-neutral-400 hover:text-red-500 transition-colors p-1"
              title="Закрыть плеер"
              aria-label="Закрыть плеер"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;