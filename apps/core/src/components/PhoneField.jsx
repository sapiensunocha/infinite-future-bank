import React from 'react';
import { Smartphone } from 'lucide-react';

export default function PhoneField({
  value = '',
  onChange,
  autoFocus = false,
  focusColor = 'blue',
  placeholder = '+1 234 567 8900',
  required = true,
  disabled = false,
  className = '',
}) {
  const focusBorder = focusColor === 'emerald' ? 'focus:border-emerald-600 focus:ring-emerald-500/15' : 'focus:border-blue-600 focus:ring-blue-500/15';
  const iconFocus = focusColor === 'emerald' ? 'group-focus-within:text-emerald-600' : 'group-focus-within:text-blue-600';

  const handleChange = (e) => {
    const val = e && e.target !== undefined ? e.target.value : e;
    if (onChange) onChange(val);
  };

  return (
    <div className={`relative group w-full ${className}`}>
      <Smartphone
        className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 ${iconFocus} transition-colors pointer-events-none`}
        size={18}
      />
      <input
        type="tel"
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 ${focusBorder} transition-all`}
      />
    </div>
  );
}
