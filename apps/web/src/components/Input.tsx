import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

const baseFieldClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  function Input({ label, error, hint, className = '', ...rest }, ref) {
    return (
      <label className="block">
        <span className="block text-sm font-medium text-slate-800 mb-1">{label}</span>
        <input ref={ref} className={`${baseFieldClass} ${className}`} {...rest} />
        {hint && !error && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
        {error && <span className="block text-xs text-rose-600 mt-1">{error}</span>}
      </label>
    );
  },
);

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(function Select({ label, error, hint, children, className = '', ...rest }, ref) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-800 mb-1">{label}</span>
      <select ref={ref} className={`${baseFieldClass} ${className}`} {...rest}>
        {children}
      </select>
      {hint && !error && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-rose-600 mt-1">{error}</span>}
    </label>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(function Textarea({ label, error, hint, className = '', ...rest }, ref) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-800 mb-1">{label}</span>
      <textarea ref={ref} className={`${baseFieldClass} ${className}`} {...rest} />
      {hint && !error && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-rose-600 mt-1">{error}</span>}
    </label>
  );
});
