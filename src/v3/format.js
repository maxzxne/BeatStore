export function formatTime(time) {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatPrice(price) {
  if (price == null) return '';
  if (Number(price) === 0) return 'Бесплатно';
  return `${Math.round(Number(price))} ₽`;
}

export function formatTrackCount(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} трек`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} трека`;
  return `${n} треков`;
}

export function formatCourseCount(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} курс`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} курса`;
  return `${n} курсов`;
}

export function playMeta(beat) {
  if (!beat) return null;
  return { bpm: beat.bpm, key: beat.key, artist: beat.artist };
}
