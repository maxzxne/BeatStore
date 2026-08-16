import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { formatTime } from './format';
import { IconButton } from './components/Primitives';
import Waveform from './components/Waveform';

export default function MiniPlayerV3() {
  const {
    currentTrack,
    currentTrackUrl,
    currentTrackTitle,
    currentTrackCover,
    currentTrackMeta,
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

  useEffect(() => {
    if (!currentTrack) return undefined;
    const onKey = (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (isPlaying) pauseTrack();
        else resumeTrack();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekTo(Math.min(duration || 0, currentTime + 5));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekTo(Math.max(0, currentTime - 5));
      }
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentTrack, isPlaying, currentTime, duration, pauseTrack, resumeTrack, seekTo, toggleMute]);

  if (!currentTrack || !currentTrackTitle) return null;

  const progress = duration ? currentTime / duration : 0;

  return createPortal(
    <div className="v3-mini safe-area-bottom" role="region" aria-label="Плеер">
      <div className="v3-mini-inner">
        <div className="v3-mini-art">
          {currentTrackCover ? <img src={currentTrackCover} alt="" /> : null}
        </div>
        <div className="min-w-0 w-[140px] sm:w-[200px]">
          <div className="truncate text-sm font-semibold tracking-tight">{currentTrackTitle}</div>
          <div className="v3-data mt-0.5 text-[var(--text-faint)]">
            {formatTime(currentTime)} / {formatTime(duration)}
            {currentTrackMeta?.bpm != null ? ` · ${currentTrackMeta.bpm}` : ''}
            {currentTrackMeta?.key ? ` ${currentTrackMeta.key}` : ''}
          </div>
        </div>
        <IconButton label={isPlaying ? 'Пауза' : 'Воспроизведение'} onClick={() => (isPlaying ? pauseTrack() : resumeTrack())} className="!bg-[var(--text)] !text-[var(--on-accent)]">
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </IconButton>
        <div className="min-w-0 flex-1 hidden sm:block">
          <Waveform
            url={currentTrackUrl}
            progress={progress}
            compact
            onSeek={(ratio) => seekTo(ratio * (duration || 0))}
          />
        </div>
        <IconButton className="hidden md:grid" label={isMuted || volume === 0 ? 'Включить звук' : 'Выключить звук'} onClick={toggleMute}>
          {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </IconButton>
        <IconButton label="Закрыть плеер" onClick={stopTrack}>
          <X size={16} />
        </IconButton>
      </div>
    </div>,
    document.body
  );
}
