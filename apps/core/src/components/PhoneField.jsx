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
  const focusBorder = focusColor === 'emerald' ? 'focus:border-emerald-400' : 'focus:border-blue-400';
  const iconFocus = focusColor === 'emerald' ? 'group-focus-within:text-emerald-500' : 'group-focus-within:text-blue-500';

  const handleChange = (e) => {
    const val = e && e.target !== undefined ? e.target.value : e;
    if (onChange) onChange(val);
  };

  return (
    <div className={`relative group ${className}`}>
      <Smartphone
        className={`absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 ${iconFocus} transition-colors pointer-events-none`}
        size={20}
      />
      <input
        type="tel"
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl pl-14 pr-6 py-5 text-lg font-black outline-none ${focusBorder} focus:bg-white/80 transition-all shadow-inner hover:bg-white/60`}
      />
    </div>
  );
}
