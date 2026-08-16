import React from 'react';
import { Layers } from 'lucide-react';
import { useUiVersion } from '../contexts/UiVersionContext';

const UiSwitch = () => {
  const { isV2, setVersion } = useUiVersion();

  return (
    <div className="fixed right-3 bottom-24 z-[10000] md:bottom-8">
      <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/70 p-1 backdrop-blur-md shadow-2xl">
        <button
          type="button"
          onClick={() => setVersion('v1')}
          className={`px-3 h-9 rounded-full text-xs font-medium transition-colors ${
            !isV2 ? 'bg-white text-black' : 'text-white/70 hover:text-white'
          }`}
          aria-pressed={!isV2}
        >
          V1
        </button>
        <button
          type="button"
          onClick={() => setVersion('v2')}
          className={`px-3 h-9 rounded-full text-xs font-medium inline-flex items-center gap-1 transition-colors ${
            isV2 ? 'bg-[#22c55e] text-[#0f172a]' : 'text-white/70 hover:text-white'
          }`}
          aria-pressed={isV2}
        >
          <Layers className="h-3.5 w-3.5" />
          V2
        </button>
      </div>
    </div>
  );
};

export default UiSwitch;
