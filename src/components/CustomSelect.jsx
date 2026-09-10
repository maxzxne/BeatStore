import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Кастомный выпадающий список (V2 OLED shell).
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

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder || 'Выберите...';

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
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
      >
        <span className={!selectedOption ? 'text-white/40' : ''}>{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-[#0a0a0a] py-1 shadow-lg"
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                opt.value === value
                  ? 'bg-[#22c55e]/15 font-medium text-[#22c55e]'
                  : 'text-white hover:bg-white/5'
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
