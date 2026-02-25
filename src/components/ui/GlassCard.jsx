import React from 'react';

export default function GlassCard({ children, className = '', padding = 'p-6' }) {
  return (
    <div 
      className={`
        relative overflow-hidden
        bg-ifb-surface backdrop-blur-xl 
        border border-white/10 
        shadow-glass rounded-2xl 
        transition-all duration-300 ease-in-out
        ${padding} ${className}
      `}
    >
      {/* Subtle top-edge highlight to simulate real physical glass */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      {/* The actual content of the card */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}