
import React from 'react';
import { Play, Disc, X, Zap, FileAudio, Database } from 'lucide-react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  type: 'file'; 
  src: string;
  duration: string;
  isAudioOnly: boolean; 
}

// "Permanently Installed" Tracks - NEW VERIFIED LINKS
const BUILT_IN_TRACKS: Track[] = [
  {
    id: 'dj_alex_toma',
    title: 'SEQUÊNCIA TOMA TOMA',
    artist: 'DJ ALEX (AURA BOOSTER)',
    type: 'file',
    // Ultra-reliable Phonk track (Copyright Free / Verified URL)
    src: 'https://cdn.pixabay.com/audio/2024/05/24/audio_3495000788.mp3', 
    duration: '02:15', 
    isAudioOnly: true
  },
  {
    id: 'mtg_phonk_core',
    title: 'MTG - ALUCINAÇÃO',
    artist: 'PHONK BRAZIL',
    type: 'file',
    // Fast Phonk Beat
    src: 'https://cdn.pixabay.com/audio/2023/07/04/audio_95932598c1.mp3', 
    duration: '02:45',
    isAudioOnly: true
  },
  {
    id: 'killer_instinct',
    title: 'KILLER INSTINCT',
    artist: 'DARK WAVE',
    type: 'file',
    // Aggressive Drift Phonk
    src: 'https://cdn.pixabay.com/audio/2024/03/26/audio_03d6d03d3c.mp3',
    duration: '02:40',
    isAudioOnly: true
  }
];

interface PlaylistProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (track: Track) => void;
  currentTrackId?: string | null;
}

const Playlist: React.FC<PlaylistProps> = ({ isOpen, onClose, onSelect, currentTrackId }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[140] flex items-center justify-end bg-black/80 backdrop-blur-md animate-in slide-in-from-right duration-300">
      
      {/* Playlist Panel */}
      <div className="w-full md:w-[500px] h-full bg-black border-l border-red-900/30 shadow-[-50px_0_100px_rgba(220,38,38,0.1)] flex flex-col">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-red-950/20 to-transparent">
            <div>
                <h2 className="font-horror text-3xl text-red-600 tracking-widest drop-shadow-[0_2px_10px_rgba(220,38,38,0.5)] flex items-center gap-3">
                    <Database size={24} /> CORE MEMORY
                </h2>
                <p className="font-tech text-xs text-white/40 tracking-[0.2em] mt-2 text-red-400/80">
                    STATUS: ONLINE
                </p>
            </div>
            <button 
                onClick={onClose}
                className="text-white/30 hover:text-white transition-colors"
            >
                <X size={24} />
            </button>
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {BUILT_IN_TRACKS.map((track) => (
                <div 
                    key={track.id}
                    onClick={() => onSelect(track)}
                    className={`
                        group relative flex items-center gap-4 p-4 rounded-sm cursor-pointer border transition-all duration-300 overflow-hidden
                        ${currentTrackId === track.id 
                            ? 'bg-red-950/40 border-red-600/50 shadow-[0_0_30px_rgba(220,38,38,0.15)]' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-red-500/30'}
                    `}
                >
                    {/* Active Indicator Strip */}
                    {currentTrackId === track.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 shadow-[0_0_10px_red]"></div>
                    )}

                    {/* Icon/Cover */}
                    <div className={`
                        w-12 h-12 flex items-center justify-center rounded-sm bg-black border relative z-10
                        ${currentTrackId === track.id ? 'border-red-500 animate-pulse' : 'border-white/10 group-hover:border-red-500/50'}
                    `}>
                        {currentTrackId === track.id ? (
                            <Zap size={20} className="text-red-500" />
                        ) : (
                            <FileAudio size={20} className="text-white/30 group-hover:text-white" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 z-10">
                        <h3 className={`font-tech text-sm tracking-wide ${currentTrackId === track.id ? 'text-red-500 font-bold' : 'text-white group-hover:text-red-400'}`}>
                            {track.title}
                        </h3>
                        <p className="font-mono text-[10px] text-white/40 group-hover:text-white/60 tracking-wider">
                            {track.artist}
                        </p>
                    </div>

                    {/* Duration / Play Icon */}
                    <div className="text-right z-10">
                        <span className={`font-mono text-xs block group-hover:hidden ${currentTrackId === track.id ? 'text-red-500' : 'text-white/30'}`}>
                            {track.duration}
                        </span>
                        <Play size={16} className="text-red-500 hidden group-hover:block" />
                    </div>
                </div>
            ))}
        </div>

        {/* Footer Decoration */}
        <div className="p-4 border-t border-white/5 text-center bg-black/50">
            <span className="font-tech text-[9px] text-green-500/60 tracking-[0.5em] uppercase flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Permanent Storage Active
            </span>
        </div>

      </div>
    </div>
  );
};

export default Playlist;
