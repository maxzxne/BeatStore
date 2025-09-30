import React, { createContext, useContext, useState, useRef } from 'react';

const AudioPlayerContext = createContext();

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

export const AudioPlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackUrl, setCurrentTrackUrl] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  const playTrack = (trackId, trackUrl, trackTitle) => {
    // Если уже играет этот трек - ставим на паузу
    if (currentTrack === trackId && isPlaying) {
      pauseTrack();
      return;
    }

    // Останавливаем предыдущий трек
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Переиспользуем существующий аудио элемент или создаем новый
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    audio.src = trackUrl;
    audio.preload = 'metadata';

    // Устанавливаем информацию о треке сразу
    setCurrentTrack(trackId);
    setCurrentTrackUrl(trackUrl);
    setCurrentTrackTitle(trackTitle);

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
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const stopTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentTrackUrl(null);
    setCurrentTrackTitle(null);
    setCurrentTime(0);
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
