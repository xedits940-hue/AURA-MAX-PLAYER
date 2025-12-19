import React from 'react';

const SignatureOverlay: React.FC = React.memo(() => {
  return (
    // Positioned exactly at bottom-right (16px/16px) to overlap standard Spline branding
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-auto select-none">
        {/* 
            PIXEL PERFECT MASK CONTAINER
            - Purpose: Exact dimensions to cover "Built with Spline" (~135-145px x 32-36px).
            - Style: Solid black box, slightly rounded to match Spline badge radius.
            - Visuals: "Designed By" + "VISHAL SHARMA" in horror font.
        */}
        <div className="
            w-[150px] h-[36px]
            bg-black 
            rounded-md
            shadow-[0_0_20px_rgba(0,0,0,1)]
            flex flex-col items-center justify-center
            relative
            isolate
            overflow-hidden
        ">
            {/* Subtle Inner Glow to blend edges */}
            <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] pointer-events-none"></div>

            {/* Tiny Label to mimic badge structure */}
            <span className="
                font-cinzel 
                text-[6px] 
                text-white/30 
                tracking-[0.2em] 
                uppercase
                leading-none
                mb-[1px]
            ">
                Designed By
            </span>

            {/* The Name - Scaled to fit perfectly in the badge area */}
            <h1 className="
                font-horror 
                text-[16px] 
                text-red-600 
                tracking-[0.1em] 
                leading-none 
                drop-shadow-[0_0_2px_rgba(220,38,38,0.5)]
                whitespace-nowrap
            ">
                VISHAL SHARMA
            </h1>
        </div>
    </div>
  );
});

export default SignatureOverlay;