import React from 'react';
import { useUiVersion } from '../contexts/UiVersionContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

const UiSwitch = () => {
  const { version, setVersion } = useUiVersion();
  const { currentTrack, currentTrackTitle } = useAudioPlayer();
  const playerOpen = Boolean(currentTrack && currentTrackTitle);

  const btn = (id, label) => (
    <button
      type="button"
      onClick={() => setVersion(id)}
      className={`px-3 h-9 rounded-full text-xs font-medium transition-colors ${
        version === id
            ? id === 'v3'
            ? 'bg-white text-black'
            : id === 'v2'
              ? 'bg-[#22c55e] text-[#0f172a]'
              : 'bg-white text-black'
          : 'text-white/70 hover:text-white'
      }`}
      aria-pressed={version === id}
    >
      {label}
    </button>
  );

  return (
    <div className={`fixed right-3 z-[10000] ${playerOpen ? 'bottom-28' : 'bottom-6'}`}>
      <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/70 p-1 backdrop-blur-md shadow-2xl">
        {btn('v1', 'V1')}
        {btn('v2', 'V2')}
        {btn('v3', 'V3')}
      </div>
    </div>
  );
};

export default UiSwitch;
