export default function GlassCard({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-glass ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
