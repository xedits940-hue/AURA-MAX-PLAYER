
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Play, Pause, SkipBack, SkipForward, Power, X, Zap, Disc, Minus, Plus } from 'lucide-react';
import { audioEngine } from './services/audioEngine';
import Visualizer from './components/Visualizer';
import CustomCursor from './components/CustomCursor';
import BrandingOverlay from './components/BrandingOverlay';
import SignatureOverlay from './components/SignatureOverlay';

function App() {
  const [introState, setIntroState] = useState<'idle' | 'active' | 'finished'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false); 
  const [isDolbyActive, setIsDolbyActive] = useState(false); 
  
  // ECHO STATE
  const [isEchoActive, setIsEchoActive] = useState(false);
  const [echoLevel, setEchoLevel] = useState(20); 

  // MAX POWER STATE
  const [isMaxActive, setIsMaxActive] = useState(false);
  const [maxLevel, setMaxLevel] = useState(50); // Start high for "M" mode

  // BASS CONTROL STATE
  const [bassLevel, setBassLevel] = useState(20); 
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Volume Slider State (0 to 1000)
  const [volumeSlider, setVolumeSlider] = useState(100); 
  
  const [showControls, setShowControls] = useState(false);
  
  const mediaRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startExperience = useCallback(async () => {
    setIntroState('active');
    // Trigger the procedural Dolby Atmos thunder
    await audioEngine.playThunder();
    
    // Transition to finished state after the 6s animation completes (synced with audio fade)
    setTimeout(() => {
        setIntroState('finished');
        audioEngine.resumeContext(); // Force resume
    }, 6000);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Treat local uploads as media (could be audio or video)
      loadMedia(URL.createObjectURL(file), false);
    }
  };

  const loadMedia = (src: string, audioOnly: boolean) => {
      if (mediaUrl && !src.startsWith('blob:')) {
          // cleanup
      }
      
      if(mediaRef.current) {
          mediaRef.current.pause();
          mediaRef.current.removeAttribute('src'); 
          mediaRef.current.load();
      }
      
      audioEngine.suspend(); 

      setMediaUrl(src);
      setIsAudioOnly(audioOnly);
      setIsPlaying(true);
      setCurrentTime(0);

      audioEngine.resumeContext();
      setTimeout(() => {
            if (mediaRef.current) {
                mediaRef.current.src = src;
                mediaRef.current.load();
                
                const playPromise = mediaRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        audioEngine.init(mediaRef.current!);
                        audioEngine.setVolume(volumeSlider);
                        // Apply existing Dolby state & Bass Level
                        audioEngine.setBassLevel(bassLevel);
                        audioEngine.setDolbyMode(isDolbyActive);
                        audioEngine.setEchoLevel(echoLevel);
                        audioEngine.setEchoMode(isEchoActive);
                        audioEngine.setMaxLevel(maxLevel);
                        audioEngine.setMaxMode(isMaxActive);
                        setIsPlaying(true);
                    }).catch(error => {
                        console.error("Auto-play failed:", error);
                        setIsPlaying(false);
                    });
                }
            }
      }, 100);
  };

  const closeMedia = () => {
      // Use the new Fade Out logic for a smooth exit
      audioEngine.fadeOutAndPause();
      
      // Delay cleaning up state to allow fade to finish slightly visually (optional, but good for UX)
      // For immediate response, we reset UI but sound fades
      setTimeout(() => {
          setMediaUrl(null);
          setIsPlaying(false);
          setCurrentTime(0);
      }, 500);
      
      audioEngine.playHoverSound();
  };

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (mediaRef.current.paused) {
      // PLAY: Resume context and play
      audioEngine.resumeContext();
      mediaRef.current.play().catch(e => console.error("Play error:", e));
      setIsPlaying(true);
    } else {
      // PAUSE: Use the "Feed Off" smooth fade
      audioEngine.fadeOutAndPause();
      setIsPlaying(false);
    }
  };

  const toggleDolby = () => {
      const newState = !isDolbyActive;
      setIsDolbyActive(newState);
      audioEngine.setDolbyMode(newState);
      audioEngine.playHoverSound(); 
  };

  // --- BASS HANDLERS ---
  const increaseBass = () => {
      if(!isDolbyActive) return; 
      setBassLevel(prev => {
          const newVal = Math.min(50, prev + 5);
          audioEngine.setBassLevel(newVal);
          return newVal;
      });
      audioEngine.playHoverSound();
  };

  const decreaseBass = () => {
      if(!isDolbyActive) return;
      setBassLevel(prev => {
          const newVal = Math.max(0, prev - 5);
          audioEngine.setBassLevel(newVal);
          return newVal;
      });
      audioEngine.playHoverSound();
  };

  // --- ECHO HANDLERS ---
  const toggleEcho = () => {
      const newState = !isEchoActive;
      setIsEchoActive(newState);
      audioEngine.setEchoMode(newState);
      audioEngine.playHoverSound();
  };

  const increaseEcho = () => {
      if(!isEchoActive) return;
      setEchoLevel(prev => {
          const newVal = Math.min(50, prev + 5);
          audioEngine.setEchoLevel(newVal);
          return newVal;
      });
      audioEngine.playHoverSound();
  };

  const decreaseEcho = () => {
      if(!isEchoActive) return;
      setEchoLevel(prev => {
          const newVal = Math.max(0, prev - 5);
          audioEngine.setEchoLevel(newVal);
          return newVal;
      });
      audioEngine.playHoverSound();
  };

  // --- MAX POWER (M) HANDLERS ---
  const toggleMax = () => {
      const newState = !isMaxActive;
      setIsMaxActive(newState);
      audioEngine.setMaxMode(newState);
      audioEngine.playHoverSound();
  };

  const increaseMax = () => {
      if(!isMaxActive) return;
      setMaxLevel(prev => {
          const newVal = Math.min(50, prev + 5);
          audioEngine.setMaxLevel(newVal);
          return newVal;
      });
      audioEngine.playHoverSound();
  };

  const decreaseMax = () => {
      if(!isMaxActive) return;
      setMaxLevel(prev => {
          const newVal = Math.max(0, prev - 5);
          audioEngine.setMaxLevel(newVal);
          return newVal;
      });
      audioEngine.playHoverSound();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      if (mediaRef.current) {
          mediaRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolumeSlider(val);
      audioEngine.setVolume(val);
  };

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  useEffect(() => {
      const el = mediaRef.current;
      if (!el) return;

      const onTimeUpdate = () => setCurrentTime(el.currentTime);
      const onLoadedMetadata = () => {
          setDuration(el.duration);
          if(isPlaying) el.play().catch(() => setIsPlaying(false));
      };
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onEnded = () => setIsPlaying(false);
      const onError = (e: any) => console.error("Media Element Error:", el.error);

      el.addEventListener('timeupdate', onTimeUpdate);
      el.addEventListener('loadedmetadata', onLoadedMetadata);
      el.addEventListener('play', onPlay);
      el.addEventListener('pause', onPause);
      el.addEventListener('ended', onEnded);
      el.addEventListener('error', onError);

      return () => {
          el.removeEventListener('timeupdate', onTimeUpdate);
          el.removeEventListener('loadedmetadata', onLoadedMetadata);
          el.removeEventListener('play', onPlay);
          el.removeEventListener('pause', onPause);
          el.removeEventListener('ended', onEnded);
          el.removeEventListener('error', onError);
      }
  }, [mediaUrl, isPlaying]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeDisplay = (val: number) => {
      if (val <= 100) return `${Math.round(val)}%`;
      const progress = (val - 100) / 900; 
      const percentage = 100 + (progress * 300);
      return `${Math.round(percentage)}%`;
  };

  return (
    <div 
        ref={containerRef}
        className="relative w-full h-screen bg-black overflow-hidden font-sans select-none flex items-center justify-center"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
    >
      <CustomCursor />

      {/* SIGNATURE OVERLAY */}
      {!mediaUrl && <SignatureOverlay />}
      
      {/* INITIALIZATION OVERLAY */}
      {introState === 'idle' && (
          <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center bg-black">
              <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
                  <iframe 
                    src='https://my.spline.design/drone-Y2YaP6l6YEBXT1v8Kq4vghGg/' 
                    frameBorder='0' 
                    width='100%' 
                    height='100%'
                    className="w-full h-full"
                    title="Drone Background"
                  ></iframe>
              </div>
              <div className="absolute inset-0 z-1 bg-black/40 radial-gradient(circle, transparent 0%, black 100%) pointer-events-none"></div>

              <div 
                  className="group relative cursor-pointer w-32 h-32 flex items-center justify-center z-10"
                  onClick={startExperience}
              >
                  <div className="absolute inset-0 rounded-full border border-red-900/40 animate-[spin_3s_linear_infinite] group-hover:animate-[spin_0.5s_linear_infinite] group-hover:border-red-500 transition-all duration-300"></div>
                  <div className="absolute inset-2 rounded-full border border-red-800/20 border-t-red-600/80 animate-[spin-reverse_5s_linear_infinite] group-hover:animate-[spin-reverse_0.8s_linear_infinite]"></div>
                  <div className="absolute inset-6 rounded-full border-2 border-transparent border-r-white/50 border-l-red-500 animate-[spin_2s_linear_infinite] group-hover:animate-[spin_0.2s_linear_infinite] shadow-[0_0_20px_rgba(220,38,38,0.5)]"></div>
                  <div className="absolute inset-0 bg-red-600/10 blur-2xl rounded-full animate-pulse-fast group-hover:bg-red-600/30 transition-all"></div>
                  <div className="relative z-10 flex flex-col items-center gap-2">
                      <div className="p-4 rounded-full bg-black/80 backdrop-blur-sm border border-red-900/50 group-hover:border-red-500 group-hover:bg-red-950/20 group-hover:shadow-[0_0_50px_rgba(255,0,0,0.6)] transition-all duration-300">
                          <Power className="text-red-700 w-6 h-6 group-hover:text-white transition-colors" />
                      </div>
                  </div>
              </div>
              <div className="mt-8 flex flex-col items-center gap-1 z-10">
                 <span className="font-tech tracking-[0.5em] text-red-900 text-[10px] group-hover:text-red-500 transition-colors animate-pulse bg-black/50 px-2 py-1 rounded">AURA SYSTEM OFFLINE</span>
                 <span className="font-horror tracking-[0.2em] text-white/30 text-xs group-hover:text-white/80 transition-colors bg-black/30 px-2 rounded">INITIATE SEQUENCE</span>
              </div>
          </div>
      )}

      {/* MAIN CONTENT CONTAINER */}
      <div 
        className={`
            relative w-full h-full 
            transition-all duration-[6000ms] cubic-bezier(0.16, 1, 0.3, 1)
            ${introState === 'idle' ? 'scale-[2.0] opacity-0 blur-xl' : ''}
            ${introState === 'active' ? 'scale-100 opacity-100 blur-0' : ''}
            ${introState === 'finished' ? 'scale-100 opacity-100 blur-0' : ''}
        `}
      >
        <div className={`transition-opacity duration-1000 delay-1000 ${introState === 'finished' ? 'opacity-100' : 'opacity-0'}`}>
            {!isUnlocked && <BrandingOverlay />}
        </div>

        <Visualizer 
            mediaRef={mediaRef}
            mediaUrl={mediaUrl}
            onUnlock={handleUnlock}
            isAudioOnly={isAudioOnly}
        />

        {/* ABORT BUTTON (Tiny X, No Box) */}
        {mediaUrl && (
             <div className="absolute top-4 right-4 z-[200] animate-in fade-in zoom-in duration-300">
                <button 
                    onClick={closeMedia}
                    className="group relative flex items-center justify-center p-2 transition-all duration-200 hover:scale-125 hover:rotate-90"
                >
                    {/* MAGMA X CSS ICON - SMALL */}
                    <div className="text-3xl magma-x select-none cursor-pointer">X</div>
                </button>
             </div>
        )}

        {/* UPLOAD BUTTON - TEXT ONLY */}
        {!mediaUrl && introState === 'finished' && (
            <div className="absolute inset-x-0 bottom-32 flex justify-center z-50 pointer-events-none animate-reveal gap-8">
                <div 
                    className="pointer-events-auto group cursor-pointer perspective-500"
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={() => audioEngine.playHoverSound()}
                >
                    <div className="relative overflow-hidden flex items-center gap-6 bg-black/80 backdrop-blur-xl border border-cyan-500/30 group-hover:border-cyan-400 pl-3 pr-10 py-3 rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                        <div className="w-12 h-12 rounded-full bg-cyan-950/30 border border-cyan-500/50 group-hover:border-cyan-400 flex items-center justify-center transition-colors duration-200">
                            <Upload size={20} className="text-cyan-400 group-hover:text-white transition-colors" />
                        </div>
                        <span className="font-horror text-2xl text-cyan-50 tracking-[0.15em] group-hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] glitch-btn" data-text="UPLOAD SOURCE">
                            UPLOAD SOURCE
                        </span>
                    </div>
                </div>
            </div>
        )}

        {/* Control Bar */}
        {introState === 'finished' && (
            <div className={`
                absolute bottom-0 left-0 w-full 
                bg-gradient-to-t from-black via-black/95 to-transparent 
                pt-24 pb-10 px-16
                transition-all duration-700 ease-in-out z-[120]
                flex flex-col gap-6
                ${showControls && (mediaUrl) ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}
            `}>
                {/* Progress Bar - Z-INDEX BOOSTED TO 150 */}
                <div className="w-full flex items-center gap-6 group z-[150] relative">
                    <span className="text-white/40 font-mono text-[10px] tracking-widest w-12 text-right">{formatTime(currentTime)}</span>
                    <div className="relative flex-grow h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                                className="absolute left-0 top-0 h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                                style={{ width: `${(currentTime / duration) * 100}%` }} 
                        />
                        <input 
                            type="range" 
                            min="0" 
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    <span className="text-white/40 font-mono text-[10px] tracking-widest w-12">{formatTime(duration)}</span>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        
                        {/* DOLBY ATMOS CONTROL GROUP */}
                        <div className={`
                            flex items-center gap-2 p-1 rounded-sm border transition-all duration-300
                            ${isDolbyActive ? 'border-red-900/50 bg-red-950/20' : 'border-transparent'}
                        `}>
                            <button 
                                onClick={decreaseBass}
                                className={`w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-all ${!isDolbyActive && 'opacity-20 cursor-default'}`}
                                disabled={!isDolbyActive}
                            >
                                <Minus size={14} />
                            </button>

                            <button 
                                onClick={toggleDolby}
                                className={`
                                    group relative w-10 h-10 flex items-center justify-center rounded-sm border transition-all duration-300
                                    ${isDolbyActive 
                                        ? 'border-red-600 bg-red-950/40 shadow-[0_0_20px_rgba(220,38,38,0.6)]' 
                                        : 'border-white/10 bg-transparent hover:border-red-500/50'}
                                `}
                            >
                                <span className={`
                                    font-luxury font-bold text-xl transition-colors duration-300
                                    ${isDolbyActive ? 'text-red-500 drop-shadow-[0_0_5px_red]' : 'text-white/40 group-hover:text-white'}
                                `}>
                                    D
                                </span>
                                {isDolbyActive && (
                                    <div className="absolute inset-0 rounded-sm animate-pulse-fast bg-red-500/10 pointer-events-none"></div>
                                )}
                                <span className="absolute left-[120%] top-1/2 -translate-y-1/2 font-tech text-[8px] text-red-500 tracking-widest opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/90 px-2 py-1 border border-red-900 pointer-events-none z-50">
                                    DOLBY ATMOS
                                </span>
                                {isDolbyActive && (
                                    <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-red-900/50">
                                        <div 
                                            className="h-full bg-red-500 transition-all duration-300"
                                            style={{ width: `${(bassLevel / 50) * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                            </button>

                            <button 
                                onClick={increaseBass}
                                className={`w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-all ${!isDolbyActive && 'opacity-20 cursor-default'}`}
                                disabled={!isDolbyActive}
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* ECHO (E) CONTROL GROUP */}
                        <div className={`
                            flex items-center gap-2 p-1 rounded-sm border transition-all duration-300
                            ${isEchoActive ? 'border-red-900/50 bg-red-950/20' : 'border-transparent'}
                        `}>
                            <button 
                                onClick={decreaseEcho}
                                className={`w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-all ${!isEchoActive && 'opacity-20 cursor-default'}`}
                                disabled={!isEchoActive}
                            >
                                <Minus size={14} />
                            </button>

                            <button 
                                onClick={toggleEcho}
                                className={`
                                    group relative w-10 h-10 flex items-center justify-center rounded-sm border transition-all duration-300
                                    ${isEchoActive 
                                        ? 'border-red-600 bg-red-950/40 shadow-[0_0_20px_rgba(220,38,38,0.6)]' 
                                        : 'border-white/10 bg-transparent hover:border-red-500/50'}
                                `}
                            >
                                <span className={`
                                    font-luxury font-bold text-xl transition-colors duration-300
                                    ${isEchoActive ? 'text-red-500 drop-shadow-[0_0_5px_red]' : 'text-white/40 group-hover:text-white'}
                                `}>
                                    E
                                </span>
                                {isEchoActive && (
                                    <div className="absolute inset-0 rounded-sm animate-pulse-fast bg-red-500/10 pointer-events-none"></div>
                                )}
                                <span className="absolute left-[120%] top-1/2 -translate-y-1/2 font-tech text-[8px] text-red-500 tracking-widest opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/90 px-2 py-1 border border-red-900 pointer-events-none z-50">
                                    ECHO ENHANCE
                                </span>
                                {isEchoActive && (
                                    <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-red-900/50">
                                        <div 
                                            className="h-full bg-red-500 transition-all duration-300"
                                            style={{ width: `${(echoLevel / 50) * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                            </button>

                            <button 
                                onClick={increaseEcho}
                                className={`w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-all ${!isEchoActive && 'opacity-20 cursor-default'}`}
                                disabled={!isEchoActive}
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                         {/* MAX POWER (M) CONTROL GROUP - NEW */}
                         <div className={`
                            flex items-center gap-2 p-1 rounded-sm border transition-all duration-300
                            ${isMaxActive ? 'border-red-900/50 bg-red-950/20' : 'border-transparent'}
                        `}>
                            <button 
                                onClick={decreaseMax}
                                className={`w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-all ${!isMaxActive && 'opacity-20 cursor-default'}`}
                                disabled={!isMaxActive}
                            >
                                <Minus size={14} />
                            </button>

                            <button 
                                onClick={toggleMax}
                                className={`
                                    group relative w-10 h-10 flex items-center justify-center rounded-sm border transition-all duration-300
                                    ${isMaxActive 
                                        ? 'border-red-600 bg-red-950/40 shadow-[0_0_20px_rgba(220,38,38,0.6)]' 
                                        : 'border-white/10 bg-transparent hover:border-red-500/50'}
                                `}
                            >
                                <span className={`
                                    font-luxury font-bold text-xl transition-colors duration-300
                                    ${isMaxActive ? 'text-red-500 drop-shadow-[0_0_5px_red]' : 'text-white/40 group-hover:text-white'}
                                `}>
                                    M
                                </span>
                                {isMaxActive && (
                                    <div className="absolute inset-0 rounded-sm animate-pulse-fast bg-red-500/10 pointer-events-none"></div>
                                )}
                                <span className="absolute left-[120%] top-1/2 -translate-y-1/2 font-tech text-[8px] text-red-500 tracking-widest opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/90 px-2 py-1 border border-red-900 pointer-events-none z-50">
                                    MAX POWER
                                </span>
                                {isMaxActive && (
                                    <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-red-900/50">
                                        <div 
                                            className="h-full bg-red-500 transition-all duration-300"
                                            style={{ width: `${(maxLevel / 50) * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                            </button>

                            <button 
                                onClick={increaseMax}
                                className={`w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-all ${!isMaxActive && 'opacity-20 cursor-default'}`}
                                disabled={!isMaxActive}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        
                        <div className="w-[1px] h-8 bg-white/10 mx-2"></div>

                        <button className="text-white/30 hover:text-white transition-all duration-300 hover:scale-110"><SkipBack size={20} strokeWidth={1} /></button>
                        <button onClick={togglePlay} className="text-white hover:text-red-500 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,0,0,0.4)] rounded-full">
                            {isPlaying ? <Pause size={40} strokeWidth={1} fill="white" className="fill-white hover:fill-red-500 transition-colors" /> : <Play size={40} strokeWidth={1} fill="white" className="fill-white hover:fill-red-500 transition-colors" />}
                        </button>
                        <button className="text-white/30 hover:text-white transition-all duration-300 hover:scale-110"><SkipForward size={20} strokeWidth={1} /></button>
                    </div>

                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-4 group">
                            <div className="relative w-40 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group-hover:h-2 transition-all">
                                <div 
                                    className={`absolute left-0 top-0 h-full transition-all duration-100 ease-out ${volumeSlider > 100 ? 'bg-gradient-to-r from-white via-red-500 to-red-600 shadow-[0_0_20px_red]' : 'bg-white'}`}
                                    style={{ width: `${(volumeSlider / 1000) * 100}%` }}
                                ></div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1000" 
                                    value={volumeSlider} 
                                    onChange={handleVolumeChange} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                            <span className={`text-[10px] font-mono w-20 text-right ${volumeSlider > 100 ? 'text-red-500 font-bold' : 'text-white/40'}`}>
                                {getVolumeDisplay(volumeSlider)}
                            </span>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className="text-[10px] font-tech tracking-[0.2em] text-white/50 hover:text-white transition-colors uppercase border-b border-transparent hover:border-red-600 pb-1"
                            >
                                Open File
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/*,audio/*"
        className="hidden"
      />
    </div>
  );
}

export default App;
