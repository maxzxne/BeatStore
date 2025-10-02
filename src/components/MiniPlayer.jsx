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

  if (!currentTrack && !currentTrackTitle) {
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4 z-50">
      <div className="container mx-auto">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleTogglePlay}
            className="bg-black hover:bg-gray-800 rounded-full p-2 transition-colors"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-white" />
            ) : (
              <Play className="h-5 w-5 text-white" />
            )}
          </button>
          
          <div className="flex-1">
            <div className="text-sm text-black mb-1">{currentTrackTitle}</div>
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <div
                className="flex-1 h-1 bg-gray-300 rounded-full cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-black rounded-full transition-all"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Seek buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newTime = Math.max(0, currentTime - 10);
                seekTo(newTime);
              }}
              disabled={!currentTrack}
              className="w-8 h-8 rounded-full border border-gray-300 hover:border-black flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-8 h-8 rounded-full border border-gray-300 hover:border-black flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Вперед на 10 секунд"
            >
              <span className="text-xs font-medium">+10</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button onClick={toggleMute} className="text-gray-600 hover:text-black">
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
              className="w-16 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
            />
            <button 
              onClick={handleClose} 
              className="text-gray-600 hover:text-red-500 transition-colors"
              title="Закрыть плеер"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;