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

import React, { createContext, useContext, useState, useRef } from 'react';

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

  const playTrack = (trackId, trackUrl, trackTitle) => {
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

    // Если это тот же трек, но плеер был закрыт - возобновляем с текущей позиции
    if (audioRef.current && audioRef.current.src === trackUrl) {
      setCurrentTrack(trackId);
      setCurrentTrackUrl(trackUrl);
      setCurrentTrackTitle(trackTitle);
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('Ошибка воспроизведения:', error);
        });
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
      audio.src = trackUrl;
      audio.preload = 'metadata';
    }

    // Устанавливаем информацию о треке сразу
    setCurrentTrack(trackId);
    setCurrentTrackUrl(trackUrl);
    setCurrentTrackTitle(trackTitle);

    // Устанавливаем обработчики событий
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentTrackUrl(null);
      setCurrentTrackTitle(null);
      setCurrentTime(0);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentTrackUrl(null);
      setCurrentTrackTitle(null);
      setCurrentTime(0);
      audioRef.current = null;
    };

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
        audioRef.current = null;
      });
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resumeTrack = () => {
    if (audioRef.current && currentTrack) {
      // Убеждаемся, что нет других аудио элементов
      const allAudio = document.querySelectorAll('audio');
      allAudio.forEach(audio => {
        if (audio !== audioRef.current) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('Ошибка возобновления:', error);
        });
    }
  };

  const seekTo = (time) => {
    if (audioRef.current && !isNaN(time) && isFinite(time)) {
      const clampedTime = Math.max(0, Math.min(time, audioRef.current.duration || 0));
      
      // Проверяем, готов ли аудио элемент
      if (audioRef.current.readyState >= 2) {
        audioRef.current.currentTime = clampedTime;
        setCurrentTime(clampedTime);
        return;
      }
      
      // Останавливаем текущее воспроизведение
      const wasPlaying = isPlaying;
      if (wasPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      
      // Создаем новый аудио элемент с нужной позицией
      const newAudio = new Audio();
      newAudio.src = audioRef.current.src;
      newAudio.volume = audioRef.current.volume;
      newAudio.muted = audioRef.current.muted;
      newAudio.preload = 'metadata';
      
      // Пробуем разные события
      const handleAudioReady = () => {
        newAudio.currentTime = clampedTime;
        
        // Заменяем старый элемент
        audioRef.current = newAudio;
        
        // Настраиваем обработчики
        newAudio.ontimeupdate = () => {
          setCurrentTime(newAudio.currentTime);
        };
        
        newAudio.onended = () => {
          setIsPlaying(false);
          setCurrentTrack(null);
          setCurrentTrackUrl(null);
          setCurrentTrackTitle(null);
        };
        
        newAudio.onerror = (error) => {
          console.error('Audio error:', error);
          setIsPlaying(false);
        };
        
        setCurrentTime(clampedTime);
        setDuration(newAudio.duration);
        
        // Восстанавливаем воспроизведение если нужно
        if (wasPlaying) {
          newAudio.play().catch(error => {
            console.error('Error resuming playback:', error);
          });
        }
      };
      
      // Пробуем несколько событий
      newAudio.addEventListener('loadedmetadata', handleAudioReady, { once: true });
      newAudio.addEventListener('canplay', handleAudioReady, { once: true });
      newAudio.addEventListener('canplaythrough', handleAudioReady, { once: true });
      
      // Fallback на случай, если события не сработают
      setTimeout(() => {
        if (audioRef.current === newAudio) {
          handleAudioReady();
        }
      }, 1000);
    }
  };

  const stopTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Сбрасываем на начало
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentTrackUrl(null);
    setCurrentTrackTitle(null);
    setCurrentTime(0); // Сбрасываем время на 0
  };

  const setVolumeValue = (newVolume) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolumeState(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const isCurrentTrack = (trackId) => {
    return currentTrack === trackId;
  };

  const isCurrentTrackPlaying = (trackId) => {
    return currentTrack === trackId && isPlaying;
  };

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
    setVolume: setVolumeValue,
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
