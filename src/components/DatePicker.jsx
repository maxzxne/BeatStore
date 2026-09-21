import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function parseParts(val) {
  if (!val) return { date: '', hour: '00', minute: '00' };
  const [datePart, timePart = '00:00'] = String(val).split('T');
  const [hour = '00', minute = '00'] = timePart.split(':');
  const roundedMinute = String(Math.round(Number(minute) / 5) * 5 % 60).padStart(2, '0');
  return {
    date: datePart || '',
    hour: String(hour).padStart(2, '0'),
    minute: roundedMinute,
  };
}

function toYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Календарь под V2 dark OLED shell.
 * showTime=true → значение YYYY-MM-DDTHH:mm (как datetime-local).
 */
const DatePicker = ({
  value = '',
  onChange,
  placeholder,
  className = '',
  id,
  showTime = false,
  align = 'left',
}) => {
  const parts = parseParts(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (parts.date) {
      const [y, m] = parts.date.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });
  const [draftHour, setDraftHour] = useState(parts.hour);
  const [draftMinute, setDraftMinute] = useState(parts.minute);
  const containerRef = useRef(null);

  useEffect(() => {
    const next = parseParts(value);
    setDraftHour(next.hour);
    setDraftMinute(next.minute);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultPlaceholder = showTime ? 'ДД.ММ.ГГГГ, ЧЧ:ММ' : 'ДД.ММ.ГГГГ';

  const formatDisplay = (val) => {
    if (!val) return '';
    const p = parseParts(val);
    const [y, m, d] = p.date.split('-').map(Number);
    const dateStr = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
    if (!showTime) return dateStr;
    return `${dateStr}, ${p.hour}:${p.minute}`;
  };

  const emit = (date, hour = draftHour, minute = draftMinute) => {
    if (!date) {
      onChange('');
      return;
    }
    if (showTime) {
      onChange(`${date}T${hour}:${minute}`);
    } else {
      onChange(date);
    }
  };

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const monthName = viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  let startOffset = firstDay.getDay() - 1;
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
    const dateStr = toYYYYMMDD(cell.date);
    if (showTime) {
      emit(dateStr, draftHour, draftMinute);
    } else {
      onChange(dateStr);
      setIsOpen(false);
    }
  };

  const setToday = () => {
    const now = new Date();
    const dateStr = toYYYYMMDD(now);
    if (showTime) {
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(Math.round(now.getMinutes() / 5) * 5 % 60).padStart(2, '0');
      setDraftHour(h);
      setDraftMinute(m);
      emit(dateStr, h, m);
    } else {
      onChange(dateStr);
      setIsOpen(false);
    }
  };

  const clearDate = () => {
    onChange('');
    setIsOpen(false);
  };

  const applyTime = (hour, minute) => {
    setDraftHour(hour);
    setDraftMinute(minute);
    const date = parts.date || toYYYYMMDD(new Date());
    emit(date, hour, minute);
  };

  const selectedDate = parts.date;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
      >
        <Calendar className="h-4 w-4 shrink-0 text-white/50" />
        <span className={!value ? 'text-white/40' : ''}>
          {value ? formatDisplay(value) : (placeholder || defaultPlaceholder)}
        </span>
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1 min-w-[280px] rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium capitalize text-white">{monthName}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-0.5">
            {WEEKDAYS_RU.map((day) => (
              <div key={day} className="py-1 text-center text-xs font-medium text-white/40">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              const dateStr = toYYYYMMDD(cell.date);
              const isSelected = selectedDate === dateStr;
              const isToday = toYYYYMMDD(new Date()) === dateStr;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(cell)}
                  className={`
                    h-9 w-9 rounded-md text-sm transition-colors
                    ${!cell.isCurrentMonth ? 'text-white/20' : 'text-white'}
                    ${isSelected ? 'bg-[#22c55e] font-medium text-[#052e16]' : 'hover:bg-white/5'}
                    ${isToday && !isSelected ? 'ring-1 ring-[#22c55e]/40' : ''}
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {showTime && (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40">Часы</p>
                <div className="max-h-28 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-1">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => applyTime(h, draftMinute)}
                      className={`block w-full rounded-md px-2 py-1 text-left text-sm tabular-nums ${
                        draftHour === h
                          ? 'bg-[#22c55e] font-medium text-[#052e16]'
                          : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40">Минуты</p>
                <div className="max-h-28 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-1">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => applyTime(draftHour, m)}
                      className={`block w-full rounded-md px-2 py-1 text-left text-sm tabular-nums ${
                        draftMinute === m
                          ? 'bg-[#22c55e] font-medium text-[#052e16]'
                          : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={clearDate}
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Очистить
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={setToday}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/5"
              >
                Сегодня
              </button>
              {showTime && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-[#22c55e] px-3 py-1.5 text-sm font-medium text-[#052e16] transition hover:brightness-110"
                >
                  Готово
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
