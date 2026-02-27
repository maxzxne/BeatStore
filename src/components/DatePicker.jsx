import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/**
 * Стильный календарь под дизайн сайта (светлая и тёмная тема)
 */
const DatePicker = ({ value = '', onChange, placeholder = 'ДД.ММ.ГГГГ', className = '', id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplay = (val) => {
    if (!val) return '';
    const [y, m, d] = val.split('-').map(Number);
    return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
  };

  const toYYYYMMDD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const monthName = viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  // Первый день месяца, понедельник = 0
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  let startOffset = firstDay.getDay() - 1; // Пн=0, Вс=6
  if (startOffset < 0) startOffset += 7;

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < startOffset) {
      const d = prevMonthDays - startOffset + i + 1;
      cells.push({ day: d, isCurrentMonth: false, date: new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, d) });
    } else if (i < startOffset + daysInMonth) {
      const d = i - startOffset + 1;
      cells.push({ day: d, isCurrentMonth: true, date: new Date(viewDate.getFullYear(), viewDate.getMonth(), d) });
    } else {
      const d = i - startOffset - daysInMonth + 1;
      cells.push({ day: d, isCurrentMonth: false, date: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, d) });
    }
  }

  const handleSelect = (cell) => {
    onChange(toYYYYMMDD(cell.date));
    setIsOpen(false);
  };

  const setToday = () => {
    onChange(toYYYYMMDD(new Date()));
    setIsOpen(false);
  };

  const clearDate = () => {
    onChange('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(prev => !prev)}
        className="input w-full min-w-0 text-left flex items-center gap-2"
      >
        <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-400 shrink-0" />
        <span className={!value ? 'text-gray-500 dark:text-neutral-500' : ''}>
          {value ? formatDisplay(value) : placeholder}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-xl py-3 px-4 min-w-[280px]">
          {/* Заголовок с навигацией */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-black dark:text-white capitalize">
              {monthName}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {WEEKDAYS_RU.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 dark:text-neutral-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Сетка дат */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              const dateStr = toYYYYMMDD(cell.date);
              const isSelected = value === dateStr;
              const isToday = toYYYYMMDD(new Date()) === dateStr;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(cell)}
                  className={`
                    w-9 h-9 rounded-md text-sm transition-colors
                    ${!cell.isCurrentMonth ? 'text-gray-400 dark:text-neutral-600' : 'text-black dark:text-white'}
                    ${isSelected
                      ? 'bg-black dark:bg-neutral-600 text-white dark:text-white font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-neutral-800'
                    }
                    ${isToday && !isSelected ? 'ring-1 ring-gray-400 dark:ring-neutral-500' : ''}
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Кнопки внизу */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={clearDate}
              className="text-sm text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              Очистить
            </button>
            <button
              type="button"
              onClick={setToday}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-gray-200 dark:bg-neutral-700 text-black dark:text-white hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
