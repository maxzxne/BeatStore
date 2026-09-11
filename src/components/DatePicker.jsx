import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/**
 * Календарь под V2 dark OLED shell
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
        className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
      >
        <Calendar className="h-4 w-4 shrink-0 text-white/50" />
        <span className={!value ? 'text-white/40' : ''}>
          {value ? formatDisplay(value) : placeholder}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 min-w-[280px] rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 shadow-xl">
          {/* Заголовок с навигацией */}
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium capitalize text-white">
              {monthName}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Дни недели */}
          <div className="mb-2 grid grid-cols-7 gap-0.5">
            {WEEKDAYS_RU.map(day => (
              <div
                key={day}
                className="py-1 text-center text-xs font-medium text-white/40"
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
                    h-9 w-9 rounded-md text-sm transition-colors
                    ${!cell.isCurrentMonth ? 'text-white/20' : 'text-white'}
                    ${isSelected
                      ? 'bg-[#22c55e] font-medium text-[#052e16]'
                      : 'hover:bg-white/5'
                    }
                    ${isToday && !isSelected ? 'ring-1 ring-[#22c55e]/40' : ''}
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Кнопки внизу */}
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={clearDate}
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Очистить
            </button>
            <button
              type="button"
              onClick={setToday}
              className="rounded-full bg-[#22c55e] px-3 py-1.5 text-sm font-medium text-[#052e16] transition hover:brightness-110"
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
