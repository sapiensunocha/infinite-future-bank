export default function GlassButton({ children, className = '', variant = 'primary', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl px-5 py-2.5 transition-all active:scale-95';
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-glow-blue',
    ghost:   'bg-white/10 hover:bg-white/20 text-white border border-white/10',
    danger:  'bg-rose-600 hover:bg-rose-500 text-white',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
