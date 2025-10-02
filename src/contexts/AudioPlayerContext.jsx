/**
 * Контекст глобального аудио плеера для воспроизведения битов
 * 
 * Обеспечивает:
 * - Глобальное воспроизведение аудио на всех страницах
 * - Управление состоянием плеера (play/pause/seek)
 * - Контроль громкости и режима без звука
 * - Синхронизацию между компонентами
 * - Мини-плеер внизу страницы
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

// Создание контекста для аудио плеера
const AudioPlayerContext = createContext();

/**
 * Хук для использования контекста аудио плеера
 * @returns {Object} Объект с функциями и состоянием плеера
 */
export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

/**
 * Провайдер контекста аудио плеера
 * @param {Object} props - Свойства компонента
 * @param {React.ReactNode} props.children - Дочерние компоненты
 */
export const AudioPlayerProvider = ({ children }) => {
  // ID текущего трека
  const [currentTrack, setCurrentTrack] = useState(null);
  // URL текущего трека
  const [currentTrackUrl, setCurrentTrackUrl] = useState(null);
  // Название текущего трека
  const [currentTrackTitle, setCurrentTrackTitle] = useState(null);
  // Состояние воспроизведения
  const [isPlaying, setIsPlaying] = useState(false);
  // Текущее время воспроизведения (в секундах)
  const [currentTime, setCurrentTime] = useState(0);
  // Общая длительность трека (в секундах)
  const [duration, setDuration] = useState(0);
  // Уровень громкости (0-1)
  const [volume, setVolumeState] = useState(1);
  // Режим без звука
  const [isMuted, setIsMuted] = useState(false);
  // Ссылка на HTML audio элемент
  const audioRef = useRef(null);
  // Флаг для предотвращения обновления времени во время перемотки
  const isSeekingRef = useRef(false);

  const playTrack = useCallback((trackId, trackUrl, trackTitle) => {
    // Если уже играет этот трек - ставим на паузу
    if (currentTrack === trackId && isPlaying) {
      pauseTrack();
      return;
    }

    // Если это тот же трек, но на паузе - просто возобновляем
    if (currentTrack === trackId && !isPlaying && audioRef.current) {
      resumeTrack();
      return;
    }

    // Останавливаем предыдущий трек
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Переиспользуем существующий аудио элемент или создаем новый
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    
    // Устанавливаем src только если это новый трек
    if (audio.src !== trackUrl) {
      console.log('Changing track from', audio.src, 'to', trackUrl);
      audio.src = trackUrl;
      audio.preload = 'metadata';
      // Сбрасываем время при смене трека
      setCurrentTime(0);
    }

    // Устанавливаем громкость и режим без звука
    audio.volume = volume;
    audio.muted = isMuted;

    // Устанавливаем обработчики событий
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentTrackUrl(null);
      setCurrentTrackTitle(null);
      setCurrentTime(0);
    };

    audio.onerror = () => {
      console.error('Ошибка воспроизведения аудио');
      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentTrackUrl(null);
      setCurrentTrackTitle(null);
      setCurrentTime(0);
    };

    // Устанавливаем информацию о треке
    setCurrentTrack(trackId);
    setCurrentTrackUrl(trackUrl);
    setCurrentTrackTitle(trackTitle);
    // НЕ сбрасываем время при смене трека

    // Запускаем воспроизведение
    audio.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(error => {
        console.error('Ошибка воспроизведения:', error);
        setIsPlaying(false);
        setCurrentTrack(null);
        setCurrentTrackUrl(null);
        setCurrentTrackTitle(null);
        setCurrentTime(0);
      });
  }, [currentTrack, isPlaying, volume, isMuted]);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resumeTrack = useCallback(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('Ошибка возобновления:', error);
        });
    }
  }, [currentTrack]);

  const seekTo = useCallback((time) => {
    if (audioRef.current && !isNaN(time) && isFinite(time)) {
      const clampedTime = Math.max(0, Math.min(time, duration || 0));
      
      console.log('seekTo called:', {
        time,
        clampedTime,
        currentTime: audioRef.current.currentTime,
        duration: audioRef.current.duration,
        currentTrack,
        src: audioRef.current.src
      });
      
      // Устанавливаем время в аудио элементе
      audioRef.current.currentTime = clampedTime;
      
      // Обновляем состояние сразу
      setCurrentTime(clampedTime);
      
      console.log('after seekTo:', audioRef.current.currentTime);
    }
  }, [duration, currentTrack]);

  const stopTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentTrackUrl(null);
    setCurrentTrackTitle(null);
    setCurrentTime(0);
  }, []);

  const setVolume = useCallback((newVolume) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolumeState(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const isCurrentTrack = useCallback((trackId) => {
    return currentTrack === trackId;
  }, [currentTrack]);

  const isCurrentTrackPlaying = useCallback((trackId) => {
    return currentTrack === trackId && isPlaying;
  }, [currentTrack, isPlaying]);

  const value = {
    currentTrack,
    currentTrackUrl,
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
    stopTrack,
    setVolume,
    toggleMute,
    isCurrentTrack,
    isCurrentTrackPlaying
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};