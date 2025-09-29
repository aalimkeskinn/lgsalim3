import React, { useEffect, useMemo, useRef, useState } from 'react';

interface CourseSelectProps {
  options: string[]; // includes 'all'
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

// Lightweight searchable Combobox for course selection
const CourseSelect: React.FC<CourseSelectProps> = ({ options, value, onChange, placeholder = 'Ders seçin' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const normalized = options.map(o => ({ key: o, label: o === 'all' ? 'Tüm Dersler' : o }));
    if (!query) return normalized;
    const q = query.toLowerCase();
    return normalized.filter(i => i.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const commit = (key: string) => {
    onChange(key);
    setOpen(false);
    setQuery('');
  };

  const currentLabel = useMemo(() => {
    const found = options.find(o => o === value);
    if (!found) return placeholder;
    return found === 'all' ? 'Tüm Dersler' : found;
  }, [options, value, placeholder]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="inline-flex items-center justify-between min-w-[160px] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs shadow-sm hover:bg-gray-50"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate mr-2 text-gray-700">{currentLabel}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-500">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-[260px] rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder={placeholder}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightIndex(i => Math.min(i + 1, Math.max(0, items.length - 1)));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightIndex(i => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const selected = items[highlightIndex];
                  if (selected) commit(selected.key);
                } else if (e.key === 'Escape') {
                  setOpen(false);
                }
              }}
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-auto py-1">
            {items.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-500">Sonuç bulunamadı</li>
            )}
            {items.map((item, idx) => (
              <li
                key={item.key}
                role="option"
                aria-selected={item.key === value}
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => commit(item.key)}
                className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between ${idx === highlightIndex ? 'bg-emerald-50' : ''}`}
              >
                <span className="truncate">{item.label}</span>
                {item.key === value && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-600">
                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.41 0L3.296 9.46a1 1 0 011.41-1.42l3.047 3.05 6.543-6.54a1 1 0 011.408 0z" clipRule="evenodd" />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CourseSelect;
