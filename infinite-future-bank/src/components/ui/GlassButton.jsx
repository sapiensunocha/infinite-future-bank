import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GlassButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled = false, 
  className = '', 
  icon: Icon,
  fullWidth = false,
  ...props 
}) {
  
  // 🎨 1. The Core Styles (Applies to all buttons)
  const baseStyles = "relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 ease-out overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  // 📏 2. Size Variations
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  // 💎 3. The "Alpha Glass" Variants
  const variants = {
    // The main action button (Trust Blue)
    primary: "bg-ifb-primary text-white shadow-glass hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-white/10",
    
    // The subtle secondary button (Frosted Glass)
    secondary: "bg-white/5 text-white backdrop-blur-md border border-white/10 hover:bg-white/10",
    
    // The AI/DEUS action button (Electric Cyan with Glow)
    glowing: "bg-ifb-accent/10 text-ifb-accent border border-ifb-accent/50 hover:bg-ifb-accent hover:text-[#0B0F19] shadow-glow",
    
    // The danger/warning button (For mashing cash or freezing cards)
    danger: "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        ${baseStyles} 
        ${sizes[size]} 
        ${variants[variant]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      {...props}
    >
      {/* 🔮 The subtle sweeping light effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]"></div>
      
      {/* ⚙️ Content & Loading State Logic */}
      <div className="relative z-10 flex items-center gap-2">
        {isLoading && <Loader2 className="animate-spin" size={size === 'sm' ? 16 : 20} />}
        {!isLoading && Icon && <Icon size={size === 'sm' ? 16 : 20} />}
        <span>{children}</span>
      </div>
    </button>
  );
}