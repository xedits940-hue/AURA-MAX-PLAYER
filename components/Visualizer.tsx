
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Lock, Unlock } from 'lucide-react';
import SignatureOverlay from './SignatureOverlay';
import { audioEngine } from '../services/audioEngine';

interface VisualizerProps {
  mediaRef: React.RefObject<HTMLVideoElement>;
  mediaUrl: string | null;
  isAudioOnly?: boolean; 
  onUnlock?: () => void;
}

// Updated ViewState to include 'cinema-mode' instead of speeder
type ViewState = 'default' | 'zooming' | 'unlocked' | 'cinema-mode';

// PLACEHOLDER VIDEO URL (Red Cinematic Abstract to match Stranger Things Vibe)
// REPLACE THIS URL WITH YOUR OWN HOSTED VIDEO LINK IF NEEDED
const SECRET_VIDEO_URL = "https://cdn.pixabay.com/video/2023/10/22/186115-877653770_large.mp4";

// --- NEW COMPONENT: FULL SCREEN BLACK HOLE TRANSITION ---
const BlackHoleTransition: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set full screen dimensions
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const cw = w;
    const ch = h;
    const centerx = cw / 2;
    const centery = ch / 2;
    const maxorbit = 255; 

    const startTime = new Date().getTime();
    let currentTime = 0;
    let animationFrameId: number;

    class Star {
        orbital: number;
        x: number;
        y: number;
        yOrigin: number;
        speed: number;
        rotation: number;
        startRotation: number;
        id: number;
        collapseBonus: number;
        color: string;
        hoverPos: number;
        expansePos: number;
        prevR: number;
        prevX: number;
        prevY: number;
        originalY: number;

        constructor(index: number) {
            const rands = [];
            rands.push(Math.random() * (maxorbit / 2) + 1);
            rands.push(Math.random() * (maxorbit / 2) + maxorbit);

            this.orbital = (rands.reduce((p, c) => p + c, 0) / rands.length);
            this.x = centerx; 
            this.y = centery + this.orbital; 
            this.yOrigin = centery + this.orbital; 
            this.speed = (Math.floor(Math.random() * 2.5) + 1.5) * Math.PI / 180; 
            this.rotation = 0; 
            this.startRotation = (Math.floor(Math.random() * 360) + 1) * Math.PI / 180; 
            this.id = index; 
            this.collapseBonus = this.orbital - (maxorbit * 0.7); 
            if (this.collapseBonus < 0) this.collapseBonus = 0; 

            this.color = 'rgba(255,255,255,' + (1 - ((this.orbital) / 255)) + ')'; 
            this.hoverPos = centery + (maxorbit / 2) + this.collapseBonus; 
            
            // Modified Expanse Logic for "Zoom" effect
            this.expansePos = centery + (this.id % 100) * -20 + (Math.floor(Math.random() * 20) + 1); 

            this.prevR = this.startRotation;
            this.prevX = this.x;
            this.prevY = this.y;
            this.originalY = this.yOrigin;
        }

        draw() {
            // FORCE EXPANSE MODE (The Zoom Effect)
            this.rotation = this.startRotation + (currentTime * (this.speed / 2));
            
            // Accelerate the expansion for the visualizer transition
            if (this.y > this.expansePos) {
                this.y -= Math.floor(this.expansePos - this.y) / -20; 
            }
            
            if (!ctx) return;
            ctx.save();
            ctx.fillStyle = this.color;
            ctx.strokeStyle = this.color;
            ctx.beginPath();

            const radians = -this.prevR;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            const nx = (cos * (this.prevX - centerx)) + (sin * (this.prevY - centery)) + centerx;
            const ny = (cos * (this.prevY - centery)) - (sin * (this.prevX - centerx)) + centery;

            ctx.moveTo(nx, ny);
            ctx.translate(centerx, centery);
            ctx.rotate(this.rotation);
            ctx.translate(-centerx, -centery);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
            ctx.restore();

            this.prevR = this.rotation;
            this.prevX = this.x;
            this.prevY = this.y;
        }
    }

    const stars: Star[] = [];
    for (let i = 0; i < 2500; i++) { 
        stars.push(new Star(i));
    }

    const loop = () => {
        const now = new Date().getTime();
        currentTime = (now - startTime) / 50;

        ctx.fillStyle = 'rgba(0,0,0,0.2)'; // Trails
        ctx.fillRect(0, 0, cw, ch);

        for (let i = 0; i < stars.length; i++) {
            stars[i].draw();
        }
        animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] bg-black animate-in fade-in duration-500">
        <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};


const Visualizer: React.FC<VisualizerProps> = React.memo(({ mediaRef, mediaUrl, isAudioOnly, onUnlock }) => {
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [password, setPassword] = useState('');
  const [modalState, setModalState] = useState<'idle' | 'checking' | 'error' | 'success'>('idle');
  
  const [viewState, setViewState] = useState<ViewState>('default');
  const [targetMode, setTargetMode] = useState<'unlocked' | 'cinema-mode'>('unlocked');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const secretVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (showSecretModal && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showSecretModal]);

  // Transition Logic
  useEffect(() => {
      let timeoutId: ReturnType<typeof setTimeout>;
      if (viewState === 'zooming') {
          // Time matches animation duration for perfect sync
          timeoutId = setTimeout(() => {
              setViewState(targetMode);
              if (targetMode === 'unlocked' && onUnlock) onUnlock();
              
              // Handle Cinema Mode Entry
              if (targetMode === 'cinema-mode') {
                  // Pause main audio if playing
                  audioEngine.suspend(); 
              }

          }, 4500); 
      }
      return () => clearTimeout(timeoutId);
  }, [viewState, onUnlock, targetMode]);

  const playZoomSound = useCallback(() => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const t = ctx.currentTime;
        const limiter = ctx.createDynamicsCompressor();
        limiter.connect(ctx.destination);

        const osc = ctx.createOscillator();
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 4.5); 
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 1.0); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + 4.5);
        
        osc.connect(gain);
        gain.connect(limiter);
        osc.start(t);
        osc.stop(t + 4.6);

    } catch (e) {}
  }, []);

  const playUiSound = (type: 'cut' | 'error' | 'success') => {
      try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext();
          const t = ctx.currentTime;
          const masterGain = ctx.createGain();
          masterGain.gain.value = 0.8; 
          masterGain.connect(ctx.destination);
          if (type === 'error') {
              const osc1 = ctx.createOscillator();
              osc1.type = 'sawtooth';
              osc1.frequency.setValueAtTime(150, t);
              osc1.frequency.linearRampToValueAtTime(50, t + 0.5);
              const gain = ctx.createGain();
              gain.gain.setValueAtTime(1.0, t);
              gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
              osc1.connect(gain);
              gain.connect(masterGain);
              osc1.start(t); osc1.stop(t + 0.6);
          } else if (type === 'success') {
              [440, 554, 659, 880].forEach((freq, i) => {
                  const osc = ctx.createOscillator();
                  osc.type = 'triangle';
                  osc.frequency.setValueAtTime(freq, t);
                  const gain = ctx.createGain();
                  gain.gain.setValueAtTime(0, t);
                  gain.gain.linearRampToValueAtTime(0.3, t + 0.05); 
                  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
                  osc.connect(gain);
                  gain.connect(masterGain);
                  osc.start(t); osc.stop(t + 1.6);
              });
          } else {
              const osc = ctx.createOscillator();
              osc.type = 'square';
              osc.frequency.setValueAtTime(1200, t);
              osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
              const gain = ctx.createGain();
              gain.gain.setValueAtTime(0.5, t);
              gain.gain.linearRampToValueAtTime(0, t + 0.05);
              osc.connect(gain);
              gain.connect(masterGain);
              osc.start(t); osc.stop(t + 0.1);
          }
      } catch(e) {}
  };

  const startTransition = (mode: 'unlocked' | 'cinema-mode') => {
    setTargetMode(mode);
    setViewState('zooming');
    playZoomSound();
  };

  // --- HANDLERS ---

  const handleMoltenClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      playUiSound('cut');
      // Trigger zoom to SECRET VIDEO
      startTransition('cinema-mode');
  };

  const handleSecretClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      playUiSound('cut');
      setShowSecretModal(true);
      setModalState('idle');
      setPassword('');
  };

  const handleResetSystem = () => {
      playUiSound('cut');
      setViewState('default');
      // Resume main engine if media was loaded
      if (mediaUrl) audioEngine.resumeContext();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password === '6786' || password === '6787') {
          playUiSound('success');
          setModalState('success');
          await new Promise(r => setTimeout(r, 600));
          setShowSecretModal(false);
          setPassword('');
          startTransition('unlocked');
      } else {
          playUiSound('error');
          setModalState('error');
          setPassword('');
      }
  };

  const isZooming = viewState === 'zooming';

  return (
    <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
        
        <style>{`
            .secret-trigger { cursor: pointer !important; }
            
            /* REALISTIC MAGMA PHYSICS */
            
            @keyframes magma-steam {
                0% { transform: translateY(0) scale(0.5); opacity: 0; }
                30% { opacity: 0.6; }
                100% { transform: translateY(-30px) scale(2.0); opacity: 0; filter: blur(4px); } 
            }

            @keyframes magma-drip-fall {
                0% { height: 0px; width: 2px; top: 100%; opacity: 1; border-radius: 50%; }
                10% { height: 6px; width: 2px; top: 100%; border-radius: 2px; }
                20% { height: 10px; width: 1px; top: 110%; }
                100% { height: 15px; width: 1px; top: 130%; opacity: 0; }
            }

            .magma-core {
                background: radial-gradient(circle at 35% 35%, #ffffff, #facc15, #ef4444, #991b1b, #450a0a);
                box-shadow: 
                    0 0 8px rgba(239, 68, 68, 0.9),
                    0 0 16px rgba(220, 38, 38, 0.5),
                    inset 0 0 4px rgba(0,0,0,0.6);
                border-radius: 50%;
            }

            .steam-particle {
                position: absolute;
                background: rgba(255,255,255,0.7);
                border-radius: 50%;
                filter: blur(2px);
                pointer-events: none;
            }

            .drip-particle {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(to bottom, #ef4444, #7f1d1d);
                pointer-events: none;
                box-shadow: 0 0 2px red;
            }
        `}</style>

        {/* --- REALISTIC MAGMA ORB (TINY DOT MODE) --- */}
        {viewState !== 'cinema-mode' && viewState !== 'zooming' && (
            <div 
                onClick={handleMoltenClick}
                className="absolute bottom-8 left-8 z-[200] w-3 h-3 cursor-pointer group flex items-center justify-center animate-in fade-in duration-500 hover:scale-125 transition-transform"
                title="Play Secret File"
            >
                {/* Steam Particles */}
                <div className="steam-particle w-1 h-1 -top-1 left-1/2 animate-[magma-steam_2s_infinite]"></div>
                <div className="steam-particle w-0.5 h-0.5 -top-2 left-1/3 animate-[magma-steam_2.5s_infinite_0.5s]"></div>

                {/* Main Orb */}
                <div className="magma-core w-full h-full relative">
                     {/* Drip Animation */}
                     <div className="drip-particle animate-[magma-drip-fall_4s_infinite_ease-in]"></div>
                </div>
            </div>
        )}

        {/* NATIVE VIDEO MODE (Main Player) */}
        {mediaUrl && viewState !== 'cinema-mode' && (
            <div className={`absolute inset-0 z-[100] bg-black ${isAudioOnly ? 'pointer-events-none opacity-0' : ''}`}>
                <video 
                    ref={mediaRef} 
                    src={mediaUrl} 
                    playsInline 
                    crossOrigin="anonymous"
                    className="w-full h-full object-contain transition-all duration-300"
                />
            </div>
        )}

        {/* --- SECRET VIDEO CINEMA MODE (iOS Style) --- */}
        {viewState === 'cinema-mode' && (
            <div className="absolute inset-0 z-[300] bg-black animate-in fade-in duration-1000 flex items-center justify-center">
                <video 
                    ref={secretVideoRef}
                    src={SECRET_VIDEO_URL}
                    autoPlay
                    playsInline
                    controls={false}
                    className="w-full h-full object-contain pointer-events-none"
                    style={{ willChange: 'transform' }} // Optimization for smoothness
                />
                 
                 {/* Signature Overlay - Consistent Branding */}
                 <SignatureOverlay />

                 {/* Close Button for Cinema Mode */}
                 <div className="absolute top-4 right-4 z-[400]">
                    <button 
                        onClick={handleResetSystem}
                        className="group relative flex items-center justify-center p-2 transition-all duration-200 hover:scale-125 hover:rotate-90"
                    >
                        <div className="text-3xl magma-x select-none cursor-pointer">X</div>
                    </button>
                </div>
            </div>
        )}

        {/* BACKGROUND ROBOT (Idle State) */}
        {(!mediaUrl) || isAudioOnly ? (
            <>
                {/* Robot 1 (Default) */}
                <div className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-500 ${(viewState === 'default' && !mediaUrl) ? 'opacity-100' : 'opacity-0'}`}>
                    <iframe 
                        src='https://my.spline.design/nexbotrobotcharacterconcept-gi3Ly2fCGUlBhkyVPxMfGLeI/' 
                        frameBorder='0' 
                        width='100%' 
                        height='100%'
                        className="w-full h-full border-none"
                        title="Robot 1"
                    />
                </div>

                {/* Secret Trigger (Center) */}
                {viewState === 'default' && !mediaUrl && (
                    <div 
                        onClick={handleSecretClick}
                        className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] z-50 bg-transparent cursor-pointer rounded-full"
                    ></div>
                )}

                {/* Robot 2 (Unlocked) */}
                {viewState === 'unlocked' && (
                    <>
                        <div className="absolute inset-0 z-70 w-full h-full bg-black animate-in fade-in duration-1000">
                                <iframe 
                                src='https://my.spline.design/r4xbot-VF0RcvXYy3q2cf9qXfafZiNq/' 
                                frameBorder='0' 
                                width='100%' 
                                height='100%'
                                className="w-full h-full"
                                title="OriMax Robot"
                            />
                        </div>
                        {/* MAGMA RESET */}
                        <div className="absolute top-4 right-4 z-[200] animate-in fade-in zoom-in duration-500 delay-1000">
                            <button 
                                onClick={handleResetSystem}
                                className="group relative flex items-center justify-center p-2 transition-all duration-200 hover:scale-125 hover:rotate-90"
                            >
                                <div className="text-3xl magma-x select-none cursor-pointer">X</div>
                            </button>
                        </div>
                    </>
                )}
            </>
        ) : null}

        {/* FULL SCREEN BLACK HOLE TRANSITION */}
        {isZooming && (
            <BlackHoleTransition />
        )}

        {/* PASSWORD MODAL */}
        {showSecretModal && (
            <div 
                className="fixed inset-0 z-[900] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
                onClick={() => setShowSecretModal(false)}
            >
                <div 
                    className="bg-black border border-red-900/50 shadow-[0_0_50px_rgba(255,0,0,0.3)] p-8 rounded-sm w-80"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className={`p-3 rounded-full bg-gray-900 border transition-colors duration-300 ${modalState === 'error' ? 'border-red-500 animate-pulse bg-red-950/20' : modalState === 'success' ? 'border-green-500 bg-green-950/20' : 'border-gray-800'}`}>
                            {modalState === 'success' ? <Unlock className="text-green-500" size={24} /> : <Lock className="text-red-600" size={24} />}
                        </div>
                        <div className="text-center">
                            <h2 className={`font-mono tracking-[0.2em] text-sm font-bold mb-1 ${modalState === 'success' ? 'text-green-500' : 'text-red-600'}`}>
                                {modalState === 'error' ? 'ACCESS DENIED' : modalState === 'success' ? 'ACCESS GRANTED' : 'RESTRICTED AREA'}
                            </h2>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="w-full">
                            <input 
                                ref={inputRef}
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-gray-900 border border-red-900/30 text-red-500 font-mono text-center tracking-[0.5em] p-2 outline-none focus:border-red-600 transition-all placeholder-red-900/50"
                                placeholder="••••"
                                maxLength={6}
                            />
                        </form>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
});

export default Visualizer;
