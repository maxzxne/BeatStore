/**
 * Утилиты для работы с датами в московском времени
 */

/**
 * Форматирует дату в московское время
 * @param {string|Date} dateString - Дата в формате ISO или объект Date
 * @param {object} options - Опции форматирования (по умолчанию полный формат с временем)
 * @returns {string} Отформатированная дата в московском времени
 */
export const formatMoscowDate = (dateString, options = {}) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
    ...options
  };
  
  return date.toLocaleString('ru-RU', defaultOptions);
};

/**
 * Форматирует дату только с датой (без времени) в московском времени
 * @param {string|Date} dateString - Дата в формате ISO или объект Date
 * @returns {string} Отформатированная дата
 */
export const formatMoscowDateOnly = (dateString) => {
  return formatMoscowDate(dateString, {
    hour: undefined,
    minute: undefined
  });
};

/**
 * Форматирует дату с временем в московском времени (краткий формат)
 * @param {string|Date} dateString - Дата в формате ISO или объект Date
 * @returns {string} Отформатированная дата и время
 */
export const formatMoscowDateTime = (dateString) => {
  return formatMoscowDate(dateString, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow'
  });
};


