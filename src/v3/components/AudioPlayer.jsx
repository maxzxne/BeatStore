import React from 'react';
import { Pause, Play } from 'lucide-react';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { buildMediaUrl } from '../../utils/api';
import { formatTime, playMeta } from '../format';
import Waveform from './Waveform';

export default function AudioPlayer({ beat }) {
  const {
    playTrack,
    pauseTrack,
    resumeTrack,
    seekTo,
    isCurrentTrack,
    isCurrentTrackPlaying,
    currentTime,
    duration,
  } = useAudioPlayer();

  if (!beat) return null;

  const url = buildMediaUrl(beat.demo_url);
  const cover = beat.cover_url ? buildMediaUrl(beat.cover_url) : null;
  const current = isCurrentTrack(beat.id);
  const playing = isCurrentTrackPlaying(beat.id);
  const progress = current && duration ? currentTime / duration : 0;

  const toggle = () => {
    if (!url) return;
    if (current) {
      if (playing) pauseTrack();
      else resumeTrack();
      return;
    }
    playTrack(beat.id, url, beat.title, cover, playMeta(beat));
  };

  const onSeek = (ratio) => {
    if (!url) return;
    if (!current) {
      playTrack(beat.id, url, beat.title, cover, playMeta(beat));
      return;
    }
    seekTo(ratio * (duration || 0));
  };

  return (
    <section className={`v3-stage ${playing ? 'is-playing' : ''}`} aria-label="Плеер">
      <div className="v3-stage-art">
        {cover ? <img src={cover} alt={beat.title} /> : null}
        <button type="button" className="v3-stage-play" onClick={toggle} aria-label={playing ? 'Пауза' : 'Слушать'}>
          {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
        <div className="v3-stage-wave">
          <Waveform url={url} progress={progress} onSeek={onSeek} />
        </div>
      </div>
      <div className="v3-stage-copy">
        <p className="v3-label">{current || playing ? 'Сейчас' : 'Слушать'}</p>
        <h1 className="v3-stage-title">{beat.title}</h1>
        <div className="v3-stage-stats v3-data">
          {beat.bpm != null && <span>{beat.bpm} BPM</span>}
          {beat.key && <span>{beat.key}</span>}
          <span>
            {formatTime(current ? currentTime : 0)} / {formatTime(current ? duration : 0)}
          </span>
        </div>
        <button type="button" className="v3-btn v3-btn-primary w-fit" onClick={toggle}>
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          {playing ? 'Пауза' : 'Слушать'}
        </button>
      </div>
    </section>
  );
}
