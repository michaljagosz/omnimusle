'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
// UWAGA: Tutaj, podobnie jak w film/clip, musimy dynamicznie ładować Howlera, żeby uniknąć błędów builda
// Ale w poprzednich krokach użyliśmy types.d.ts, więc import statyczny powinien działać.
// Jeśli wystąpi błąd "window is not defined", wróć do dynamicznego importu.
import { Howl } from 'howler'; 

const DURATIONS = [1000, 2000, 4000, 8000, 16000, 30000];

type Track = {
  id: number;
  title: string;
  artist: { name: string; picture_small: string; };
  album: { cover_medium: string; };
  preview: string;
};

type MashupData = {
  trackA: Track;
  trackB: Track;
  trackC: Track;
};

type Guess = {
  type: 'mashup' | 'skip';
  text?: string;
};

export default function MashupOfTheDay() {
  const [shake, setShake] = useState(false);
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  const [target, setTarget] = useState<MashupData | null>(null);
  const [round, setRound] = useState(0);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  
  const [solvedA, setSolvedA] = useState(false);
  const [solvedB, setSolvedB] = useState(false);
  const [solvedC, setSolvedC] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);

  // Howler instances
  const soundRefA = useRef<Howl | null>(null);
  const soundRefB = useRef<Howl | null>(null);
  const soundRefC = useRef<Howl | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const roundRef = useRef(round);

  useEffect(() => { roundRef.current = round; }, [round]);

  // --- INIT ---
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/daily-mashup');
        const data = await res.json();
        
        if (data.trackA && data.trackB && data.trackC) {
          setTarget(data);
          
          const saved = localStorage.getItem('mashupGameProgress');
          if (saved) {
             const parsed = JSON.parse(saved);
             if (parsed.id === data.trackA.id) {
                setGuesses(parsed.guesses);
                setRound(parsed.round);
                setGameStatus(parsed.gameStatus);
                setSolvedA(parsed.solvedA);
                setSolvedB(parsed.solvedB);
                setSolvedC(parsed.solvedC);
                if (parsed.gameStatus === 'won') setBorderColor('border-green-500');
                
                // Preload audio (bez autoplay)
                if (parsed.gameStatus === 'playing') {
                    initAudio(data.trackA.preview, data.trackB.preview, data.trackC.preview);
                }
                return;
             }
          }
          setGameStatus('playing');
          initAudio(data.trackA.preview, data.trackB.preview, data.trackC.preview);
        }
      } catch (e) { console.error(e); }
    };
    init();
    return () => { 
        if(soundRefA.current) soundRefA.current.unload();
        if(soundRefB.current) soundRefB.current.unload();
        if(soundRefC.current) soundRefC.current.unload();
    };
  }, []);

  useEffect(() => {
    if (target && gameStatus !== 'loading') {
      localStorage.setItem('mashupGameProgress', JSON.stringify({
        id: target.trackA.id, guesses, round, gameStatus, solvedA, solvedB, solvedC
      }));
    }
  }, [guesses, round, gameStatus, target, solvedA, solvedB, solvedC]);

  // --- AUDIO SETUP Z PROXY ---
  const initAudio = (srcA: string, srcB: string, srcC: string) => {
    if (soundRefA.current) soundRefA.current.unload();
    if (soundRefB.current) soundRefB.current.unload();
    if (soundRefC.current) soundRefC.current.unload();

    // Helper do tworzenia linku proxy
    const getProxyUrl = (url: string) => `/api/audio-proxy?url=${encodeURIComponent(url)}`;

    // KLUCZOWA ZMIANA: html5: false (Web Audio API)
    // To pozwala na idealny miks i preloading, ale wymaga CORS (dlatego używamy proxy)
    const commonOptions = { 
        html5: false, // Ważne!
        format: ['mp3'], 
        volume: 0.33,
        preload: true 
    };

    soundRefA.current = new Howl({ ...commonOptions, src: [getProxyUrl(srcA)] });
    soundRefB.current = new Howl({ ...commonOptions, src: [getProxyUrl(srcB)] });
    soundRefC.current = new Howl({ ...commonOptions, src: [getProxyUrl(srcC)] });
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setProgress(0);
    soundRefA.current?.stop();
    soundRefB.current?.stop();
    soundRefC.current?.stop();
    if(timerRef.current) clearTimeout(timerRef.current);
    if(requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const playSnippet = () => {
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    if (isPlaying) { stopPlayback(); return; }

    // Seek 0 i Play
    soundRefA.current?.seek(0);
    soundRefB.current?.seek(0);
    soundRefC.current?.seek(0);

    if (!solvedA) soundRefA.current?.play();
    if (!solvedB) soundRefB.current?.play();
    if (!solvedC) soundRefC.current?.play();

    setIsPlaying(true);
    startTimeRef.current = performance.now();
    
    const duration = DURATIONS[round];
    const tick = () => {
        const elapsed = performance.now() - startTimeRef.current;
        const pct = Math.min((elapsed / duration) * 100, 100);
        setProgress(pct);
        if (elapsed < duration) {
            requestRef.current = requestAnimationFrame(tick);
        } else {
            stopPlayback();
        }
    };
    requestRef.current = requestAnimationFrame(tick);

    timerRef.current = setTimeout(() => {
       if (!solvedA) soundRefA.current?.fade(0.33, 0, 200);
       if (!solvedB) soundRefB.current?.fade(0.33, 0, 200);
       if (!solvedC) soundRefC.current?.fade(0.33, 0, 200);
    }, duration - 200);
  };

  // --- LOGIKA ---
  const checkAnswer = (selected: Track) => {
    if (!target) return;
    
    const isA = !solvedA && (selected.id === target.trackA.id || selected.title.toLowerCase() === target.trackA.title.toLowerCase());
    const isB = !solvedB && (selected.id === target.trackB.id || selected.title.toLowerCase() === target.trackB.title.toLowerCase());
    const isC = !solvedC && (selected.id === target.trackC.id || selected.title.toLowerCase() === target.trackC.title.toLowerCase());

    if (isA || isB || isC) {
        if (isA) setSolvedA(true);
        if (isB) setSolvedB(true);
        if (isC) setSolvedC(true);
        
        setResults([]);
        setQuery('');
        stopPlayback(); 

        const doneA = solvedA || isA;
        const doneB = solvedB || isB;
        const doneC = solvedC || isC;

        if (doneA && doneB && doneC) {
            setGameStatus('won');
            setBorderColor('border-green-500');
        } else {
            setBorderColor('border-yellow-500'); 
            setTimeout(() => setBorderColor('border-zinc-700'), 500);
        }
    } else {
        setBorderColor('border-red-500'); setShake(true);
        setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
        setGuesses(prev => [...prev, { type: 'mashup', text: `${selected.artist.name} - ${selected.title}` }]);
        if (round < 5) { setRound(round + 1); setQuery(''); setResults([]); }
        else setGameStatus('lost');
    }
  };

  const handleSkip = () => {
    setBorderColor('border-red-500'); setShake(true);
    setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
    setGuesses(prev => [...prev, { type: 'skip' }]);
    if (round < 5) setRound(round + 1); else setGameStatus('lost');
  };

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (query.length < 2) { setResults([]); return; }
      const res = await fetch(`/api/search?q=${query}`);
      const d = await res.json();
      setResults(d.data || []);
    }, 400);
    return () => clearTimeout(delay);
  }, [query]);

  if (gameStatus === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;

  const currentDurationText = (DURATIONS[round] / 1000).toString() + 's';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans relative pb-24">
      <Link href="/" className="absolute top-4 left-4 w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 transition-colors">←</Link>

      <div className={`max-w-md w-full bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-200 relative ${borderColor} ${shake ? 'animate-shake' : ''}`}>
        
        <div className="p-5 text-center border-b border-zinc-800 bg-zinc-900/50">
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 tracking-widest uppercase">Mashup Trio</h1>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
            
            {/* SLOTS */}
            <div className="grid grid-cols-3 gap-2 w-full">
                {[{ solved: solvedA, data: target?.trackA }, { solved: solvedB, data: target?.trackB }, { solved: solvedC, data: target?.trackC }].map((slot, i) => (
                    <div key={i} className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-center transition-all overflow-hidden relative ${slot.solved ? 'bg-green-900/40 border-green-500' : 'bg-zinc-800 border-zinc-700'}`}>
                        {slot.solved && slot.data ? (
                            <>
                                <img src={slot.data.album.cover_medium} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                <div className="relative z-10 p-1 drop-shadow-md"><p className="text-[9px] font-bold leading-tight text-white shadow-black">{slot.data.title}</p></div>
                            </>
                        ) : <span className="text-2xl text-zinc-600 font-bold">?</span>}
                    </div>
                ))}
            </div>

            {/* PLAYER */}
            <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90 w-full h-full"><circle cx="50%" cy="50%" r="44" className="stroke-zinc-800" strokeWidth="6" fill="none"/><circle cx="50%" cy="50%" r="44" className="stroke-pink-500 transition-all duration-100 ease-linear" strokeWidth="6" fill="none" strokeDasharray={2*Math.PI*44} strokeDashoffset={2*Math.PI*44 - (progress/100)*2*Math.PI*44}/></svg>
                <button onClick={playSnippet} disabled={gameStatus==='lost'||gameStatus==='won'} className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700 text-3xl text-white z-10 transition-colors">{isPlaying ? '⏸' : '▶'}</button>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono text-center">{currentDurationText}</p>

            {/* HISTORIA */}
            <div className="w-full space-y-1 max-h-32 overflow-y-auto">
                {guesses.map((g, i) => (
                    <div key={i} className="text-xs text-zinc-400 bg-zinc-950 p-2 rounded flex justify-between border-l-2 border-red-500 items-center">
                        <span className="truncate mr-2">{g.type === 'skip' ? 'SKIP' : g.text}</span><span className="text-red-500 font-bold">✕</span>
                    </div>
                ))}
            </div>

            {/* INPUT */}
            {gameStatus === 'playing' && (
                <div className="w-full relative">
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for any song..." className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-pink-500 outline-none placeholder-zinc-500 transition-colors" />
                    {results.length > 0 && (
                        <div className="absolute bottom-full mb-2 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50">
                            {results.map(t => (
                                <button key={t.id} onClick={() => checkAnswer(t)} className="w-full text-left p-3 hover:bg-zinc-700 border-b border-zinc-700/50 flex gap-3 items-center transition-colors">
                                    <img src={t.artist.picture_small} className="w-8 h-8 rounded bg-zinc-900" />
                                    <div className="truncate text-xs flex-1"><span className="text-white font-bold block truncate">{t.title}</span><span className="text-zinc-400 truncate">{t.artist.name}</span></div>
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={handleSkip} className="w-full mt-3 py-3 bg-zinc-800 text-xs font-bold rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors tracking-wider">SKIP (+ TIME)</button>
                </div>
            )}

            {/* END */}
            {(gameStatus === 'won' || gameStatus === 'lost') && (
                <div className="text-center w-full animate-fade-in pt-4 border-t border-zinc-800">
                    <h2 className={`text-2xl font-bold mb-4 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>{gameStatus === 'won' ? 'MASHUP MASTER!' : 'GAME OVER'}</h2>
                    {target && <div className="text-xs text-zinc-400 mb-4 space-y-1"><p>{target.trackA.artist.name} - {target.trackA.title}</p><p>{target.trackB.artist.name} - {target.trackB.title}</p><p>{target.trackC.artist.name} - {target.trackC.title}</p></div>}
                    <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black font-bold rounded-full text-sm hover:bg-gray-200 transition-colors">SEE YOU TOMORROW</button>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}