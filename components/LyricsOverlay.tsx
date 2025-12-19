
import React, { useEffect, useState } from 'react';
import { audioEngine } from '../services/audioEngine';

interface LyricsOverlayProps {
  isPlaying: boolean;
}

// Updated with "Phonk / Funk" vibe words based on user request
const LUXURY_PHRASES = [
  "AURA",
  "TOMA",
  "VIBE",
  "REBOLA",
  "PRESSÃO",
  "SYSTEM",
  "HYPER",
  "BASS",
  "DRIFT",
  "PHONK",
  "MOTION",
  "INFINITY",
  "ALUCINAÇÃO",
  "CORE",
  "MAXIMUM",
  "OVERRIDE"
];

const LyricsOverlay: React.FC<LyricsOverlayProps> = React.memo(({ isPlaying }) => {
  const [displayedText, setDisplayedText] = useState("");
  // 'hidden' | 'visible'
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
        setIsVisible(false);
        setTimeout(() => setDisplayedText(""), 500);
        return;
    }

    const unsubscribe = audioEngine.onBeat(() => {
        // Trigger on beat
        if (Math.random() > 0.3) { // Don't trigger on EVERY beat, keep it elegant
            setIsVisible(false); // Fade out old

            setTimeout(() => {
                 // Pick new word
                 const randomPhrase = LUXURY_PHRASES[Math.floor(Math.random() * LUXURY_PHRASES.length)];
                 setDisplayedText(randomPhrase);
                 setIsVisible(true); // Fade in new
            }, 300); // Faster transition for Phonk
        }
    });

    return () => {
      unsubscribe();
    };
  }, [isPlaying]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[110] flex flex-col justify-center items-end pr-8 md:pr-32 pb-32">
        <div className="relative overflow-visible h-40 flex items-center justify-end mix-blend-screen">
            
            {/* 
                Typography: Orbitron (Tech) mixed with Cinzel
                Animation: Aggressive Glitch-in
            */}
            <h1 className={`
                font-horror 
                font-bold 
                text-6xl md:text-8xl 
                text-right
                text-transparent bg-clip-text bg-gradient-to-b from-white to-red-600
                tracking-[0.05em]
                transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)
                drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]
                ${isVisible 
                    ? 'opacity-100 translate-x-0 blur-0 scale-110' 
                    : 'opacity-0 translate-x-20 blur-xl scale-90'}
            `}>
                {displayedText}
            </h1>
        </div>
    </div>
  );
});

export default LyricsOverlay;
