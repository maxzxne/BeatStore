function formatRubLocal(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return `${value.toLocaleString('ru-RU')} ₽`;
}

/**
 * Resolve payable amount for a beat + selected license type.
 * Legacy beats may only have `price` without tier fields.
 */
export function resolveBeatPayAmount(beat, purchaseType = 'mp3') {
  if (!beat) return 0;
  if (purchaseType === 'mp3' && beat.price_mp3 != null && beat.price_mp3 !== undefined) {
    return Number(beat.price_mp3) || 0;
  }
  if (purchaseType === 'wav' && beat.price_wav != null && beat.price_wav !== undefined) {
    return Number(beat.price_wav) || 0;
  }
  if (purchaseType === 'exclusive' && beat.price_exclusive != null && beat.price_exclusive !== undefined) {
    return Number(beat.price_exclusive) || 0;
  }
  return Number(beat.price) || 0;
}

export function beatLicenseOptions(beat) {
  if (!beat) return [];
  const options = [];
  if (beat.mp3_url && beat.price_mp3 != null && beat.price_mp3 !== undefined) {
    options.push({
      type: 'mp3',
      label: 'MP3',
      amount: Number(beat.price_mp3) || 0,
      was: beat.price_mp3_was ?? null,
    });
  }
  if (beat.wav_url && beat.price_wav != null && beat.price_wav !== undefined) {
    options.push({
      type: 'wav',
      label: 'WAV',
      amount: Number(beat.price_wav) || 0,
      was: beat.price_wav_was ?? null,
    });
  }
  if (beat.exclusive_url && beat.price_exclusive != null && beat.price_exclusive !== undefined) {
    options.push({
      type: 'exclusive',
      label: 'Exclusive',
      amount: Number(beat.price_exclusive) || 0,
      was: beat.price_exclusive_was ?? null,
    });
  }
  if (options.length === 0 && beat.price != null && beat.price !== undefined) {
    options.push({
      type: 'mp3',
      label: 'Лицензия',
      amount: Number(beat.price) || 0,
      was: beat.price_was ?? null,
      legacy: true,
    });
  }
  return options;
}

export function buyButtonLabel(amount) {
  const value = Number(amount) || 0;
  if (value <= 0) return 'Получить бесплатно';
  return `Купить · ${formatRubLocal(value)}`;
}

export function beatHasDeliverableFile(beat) {
  if (!beat) return false;
  return Boolean(beat.mp3_url || beat.wav_url || beat.exclusive_url);
}
