import React from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

const AudioPlayer = ({ src, title, trackId }) => {
  const { 
    currentTrack, 
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
    isCurrentTrack, 
    isCurrentTrackPlaying 
  } = useAudioPlayer();

  const isCurrent = isCurrentTrack(trackId);
  const isCurrentlyPlaying = isCurrentTrackPlaying(trackId);

  const togglePlay = () => {
    if (isCurrent) {
      if (isCurrentlyPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      playTrack(trackId, src, title);
    }
  };

  const handleSeek = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isCurrent || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    
    console.log('AudioPlayer handleSeek:', newTime, 'from click position:', clickX, 'width:', width);
    seekTo(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg p-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={togglePlay}
          className="bg-black dark:bg-white text-white dark:text-black rounded-full p-2.5 hover:bg-gray-800 dark:hover:bg-neutral-200 transition-colors shadow-md dark:shadow-lg dark:shadow-black/30"
        >
          {isCurrentlyPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-black dark:text-white mb-2 truncate">{title}</div>
          <div className="space-y-2">
            {/* Прогресс-бар на отдельной строке */}
            <div
              className="w-full h-3 bg-gray-200 dark:bg-neutral-600 rounded-full cursor-pointer"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-black dark:bg-white rounded-full transition-all"
                style={{ 
                  width: `${isCurrent && duration ? (currentTime / duration) * 100 : 0}%` 
                }}
              />
            </div>
            {/* Время на отдельной строке */}
            <div className="flex justify-between text-xs text-gray-600 dark:text-neutral-200 font-medium">
              <span>{formatTime(isCurrent ? currentTime : 0)}</span>
              <span>{formatTime(isCurrent ? duration : 0)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleMute} 
            className="text-gray-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors"
          >
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
            className="w-16 h-1 bg-gray-300 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black dark:[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
