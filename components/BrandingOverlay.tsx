import React, { useState } from 'react';

const BrandingOverlay: React.FC = React.memo(() => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="fixed top-8 left-8 z-[150] flex items-center gap-4 cursor-pointer group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
        {/* CIRCLE ANIMATION (Restored & Optimized) */}
        <div className="relative w-8 h-8 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
            {/* Pulsing Outer Ring */}
            <div className="absolute inset-0 rounded-full border border-red-500/40 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            
            {/* Rotating Tech Ring */}
            <div className="absolute inset-0 rounded-full border-t border-l border-red-500/80 animate-[spin_3s_linear_infinite]"></div>
            
            {/* Core Dot */}
            <div className={`
                w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]
                transition-all duration-300
                ${isHovered ? 'bg-white shadow-[0_0_15px_white]' : ''}
            `}></div>
        </div>

        {/* TEXT CONTENT (Reveals on Hover) */}
        <div className={`
            flex flex-col items-start gap-1
            transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)
            ${isHovered 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 -translate-x-4 pointer-events-none blur-sm'}
        `}>
            {/* 
                UPDATED: HORROR STYLE FONT
                - Font: Creepster (font-horror)
                - Color: Blood Red (text-red-600)
                - Size: Slightly larger to emphasize the shape
            */}
            <h1 className="
                font-horror
                text-4xl 
                text-red-600
                tracking-[0.1em]
                leading-none
                whitespace-nowrap
                drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]
            ">
                AURA MAX PLAYER
            </h1>
            
            <p className="
                font-cinzel
                text-[10px]
                font-bold
                text-black
                tracking-[0.15em] 
                uppercase
                whitespace-nowrap
                bg-white/90
                px-2
                py-0.5
                rounded-sm
                border-l-4 border-red-600
                shadow-[0_0_10px_rgba(255,255,255,0.2)]
            ">
                Vision and Engineering by Vishal Sharma
            </p>
        </div>
    </div>
  );
});

export default BrandingOverlay;