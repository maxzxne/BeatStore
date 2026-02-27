import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Кастомный выпадающий список с контролируемым hover-цветом (серый вместо синего).
 * Заменяет нативный select, т.к. браузеры игнорируют стили option:hover.
 */
const CustomSelect = ({
  options = [],
  value = '',
  onChange,
  className = '',
  id,
  name,
  placeholder,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || 'Выберите...');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    onChange(opt.value);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        name={name}
        onClick={() => setIsOpen(prev => !prev)}
        className={`input w-full min-w-0 text-left flex items-center justify-between gap-2 ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
      >
        <span className={!selectedOption ? 'text-gray-500 dark:text-neutral-500' : ''}>
          {displayLabel}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-lg py-1"
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt)}
              className={`px-4 py-2.5 cursor-pointer transition-colors
                ${opt.value === value
                  ? 'bg-gray-200 dark:bg-neutral-700 text-black dark:text-white font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-neutral-800 text-black dark:text-white'
                }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
