'use client';

interface CircularPlayerProps {
  isPlaying: boolean;
  progress: number; // 0 do 100
  onToggle: () => void;
  disabled?: boolean;
  colorClass?: string; // np. "stroke-green-500"
}

export default function CircularPlayer({ 
  isPlaying, progress, onToggle, disabled = false, colorClass = "stroke-green-500" 
}: CircularPlayerProps) {
  
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* SVG Progress */}
      <svg className="absolute inset-0 -rotate-90 w-full h-full drop-shadow-xl">
        {/* Tło paska */}
        <circle cx="64" cy="64" r={RADIUS} className="stroke-zinc-800" strokeWidth="6" fill="transparent"/>
        
        {/* Aktywny pasek - BEZ ANIMACJI CSS */}
        <circle 
          cx="64" cy="64" r={RADIUS} 
          // USUNIĘTO: transition-all duration-100 ease-linear
          // Zostawiamy tylko kolor i style linii
          className={`${colorClass}`} 
          strokeWidth="6" 
          fill="transparent" 
          strokeLinecap="round"
          style={{ 
            strokeDasharray: CIRCUMFERENCE, 
            strokeDashoffset: CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE 
          }}
        />
      </svg>
      
      <button 
        onClick={onToggle} 
        disabled={disabled}
        className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors border-4 border-zinc-900
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className="text-4xl ml-1 text-white">
          {isPlaying ? '⏸' : '▶'}
        </span>
      </button>
    </div>
  );
}