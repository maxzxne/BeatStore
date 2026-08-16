const cache = new Map();

export async function extractPeaks(url, bars = 192) {
  if (!url) return [];
  const key = `${url}:${bars}`;
  if (cache.has(key)) return cache.get(key);

  const pending = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('audio fetch failed');
    const buffer = await res.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const audio = await ctx.decodeAudioData(buffer.slice(0));
    const data = audio.getChannelData(0);
    const block = Math.max(1, Math.floor(data.length / bars));
    const peaks = new Array(bars);
    for (let i = 0; i < bars; i += 1) {
      let peak = 0;
      const start = i * block;
      const end = Math.min(start + block, data.length);
      const step = Math.max(1, Math.floor((end - start) / 48));
      for (let j = start; j < end; j += step) {
        const v = Math.abs(data[j]);
        if (v > peak) peak = v;
      }
      peaks[i] = peak;
    }
    const max = Math.max(...peaks, 0.0001);
    const normalized = peaks.map((p) => {
      const n = p / max;
      return n < 0.04 ? 0.04 : Math.pow(n, 0.62);
    });
    try { ctx.close(); } catch { /* ignore */ }
    return normalized;
  })();

  cache.set(key, pending);
  try {
    const result = await pending;
    cache.set(key, result);
    return result;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}

export function fallbackPeaks(bars) {
  return Array.from({ length: bars }, (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 22437.813;
    const n = (a - Math.floor(a) + (b - Math.floor(b))) * 0.5;
    const phrase = 0.25 + 0.75 * Math.abs(Math.sin((i / bars) * Math.PI));
    return 0.08 + n * 0.72 * phrase;
  });
}
