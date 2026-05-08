import { useEffect, useRef, useState } from 'react';
import type { Category } from '@homestock/types';
import { useCreateCategory } from '../api/queries';

interface Props {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  const createCategory = useCreateCategory();
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input text when selectedId changes externally (e.g. AI extraction)
  useEffect(() => {
    const match = categories.find((c) => c.id === selectedId);
    setInputValue(match?.name ?? '');
  }, [selectedId, categories]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(inputValue.toLowerCase()),
  );
  const exactMatch = categories.some(
    (c) => c.name.toLowerCase() === inputValue.trim().toLowerCase(),
  );
  const showCreate = inputValue.trim().length > 0 && !exactMatch;

  async function handleCreate() {
    const name = inputValue.trim();
    if (!name) return;
    const cat = await createCategory.mutateAsync({ name, icon: 'box' });
    onSelect(cat.id);
    setInputValue(cat.name);
    setOpen(false);
  }

  function handleSelect(cat: Category) {
    onSelect(cat.id);
    setInputValue(cat.name);
    setOpen(false);
  }

  function handleInputChange(value: string) {
    setInputValue(value);
    setOpen(true);
    if (!value.trim()) onSelect('');
  }

  return (
    <div ref={containerRef} className="relative block">
      <span className="block text-sm font-medium text-slate-800 mb-1">Category</span>
      <input
        type="text"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
        placeholder="Search or type to create…"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (filtered.length > 0 || showCreate) && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((cat) => (
            <li
              key={cat.id}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${
                cat.id === selectedId ? 'font-medium bg-slate-50' : ''
              }`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(cat); }}
            >
              {cat.name}
            </li>
          ))}
          {showCreate && (
            <li
              className="px-3 py-2 text-sm cursor-pointer text-indigo-600 hover:bg-indigo-50 border-t border-slate-100"
              onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
            >
              {createCategory.isPending ? 'Creating…' : `Create "${inputValue.trim()}"`}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
