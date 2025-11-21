'use client';

import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import Link from 'next/link';

const DURATIONS = [500, 1000, 4000, 8000, 16000, 30000];

type FilmResult = {
  id: number;
  title: string;
  poster: string;
  year: string;
  type: 'movie' | 'tv';
};

// Typ zagadki pobieranej z naszego API daily-film
type DailyFilmPuzzle = {
  tmdbId: number;
  title: string;
  audioPreview: string;
  poster: string;
};

type Guess = {
  type: 'film' | 'skip';
  data?: FilmResult;
  isClose?: boolean; // Tutaj np. czy dobry rok/reżyser (opcjonalne, na razie false)
};

export default function FilmOfTheDay() {
  // UI
  const RADIUS = 54; const CIRCUMFERENCE = 2 * Math.PI * RADIUS; 
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  const [shake, setShake] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Game State
  const [target, setTarget] = useState<DailyFilmPuzzle | null>(null);
  const [round, setRound] = useState(0);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  
  // Audio
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Howl | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
const requestRef = useRef<number | null>(null);
  const roundRef = useRef(round);

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FilmResult[]>([]);

  useEffect(() => { roundRef.current = round; }, [round]);

  // --- DYNAMICZNE WYDŁUŻANIE ---
  useEffect(() => {
    if (isPlaying && soundRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const currentSeek = soundRef.current.seek() as number;
      const remainingMs = DURATIONS[round] - (currentSeek * 1000);
      timerRef.current = setTimeout(() => {
        soundRef.current?.fade(0.5, 0, 200);
        setTimeout(() => { soundRef.current?.stop(); soundRef.current?.volume(0.5); }, 200);
      }, Math.max(0, remainingMs));
    }
  }, [round]);

  // --- INICJALIZACJA ---
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/daily-film');
        const data = await res.json();
        if (data && data.tmdbId) {
          setTarget(data);
          // Przywracanie stanu (uproszczone)
          const saved = localStorage.getItem('filmGameProgress');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.id === data.tmdbId) {
               setGuesses(parsed.guesses);
               setRound(parsed.round);
               setGameStatus(parsed.gameStatus);
               if (parsed.gameStatus === 'won') setBorderColor('border-green-500');
               // Jeśli gramy dalej, ładujemy audio
               if (parsed.gameStatus === 'playing') initAudio(data.audioPreview);
               return;
            }
          }
          // Nowa gra
          setGameStatus('playing');
          initAudio(data.audioPreview);
        }
      } catch (e) { console.error(e); }
    };
    init();
    return () => { if(soundRef.current) soundRef.current.unload(); };
  }, []);

  // --- AUTOSAVE ---
  useEffect(() => {
    if (target && gameStatus !== 'loading') {
      localStorage.setItem('filmGameProgress', JSON.stringify({
        id: target.tmdbId, guesses, round, gameStatus
      }));
    }
  }, [guesses, round, gameStatus, target]);

  // --- AUDIO SETUP ---
  const initAudio = (src: string) => {
    if (soundRef.current) soundRef.current.unload();
    soundRef.current = new Howl({
      src: [src], html5: true, format: ['mp3'], volume: 0.5,
      onend: () => { setIsPlaying(false); if(requestRef.current) cancelAnimationFrame(requestRef.current); },
      onstop: () => { setIsPlaying(false); if(requestRef.current) cancelAnimationFrame(requestRef.current); },
      onplay: () => {
        const tick = () => {
          if(soundRef.current && soundRef.current.playing()) {
             const seek = soundRef.current.seek() as number;
             const duration = DURATIONS[roundRef.current] / 1000;
             setProgress(Math.min((seek / duration) * 100, 100));
             requestRef.current = requestAnimationFrame(tick);
          }
        };
        requestRef.current = requestAnimationFrame(tick);
      }
    });
  };

  const playSnippet = () => {
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    if (isPlaying) {
        soundRef.current?.stop();
        if(timerRef.current) clearTimeout(timerRef.current);
        setIsPlaying(false);
        return;
    }
    setIsPlaying(true); setProgress(0);
    soundRef.current?.seek(0); soundRef.current?.volume(0.5); soundRef.current?.play();
    timerRef.current = setTimeout(() => {
        soundRef.current?.fade(0.5, 0, 200);
        setTimeout(() => { soundRef.current?.stop(); soundRef.current?.volume(0.5); }, 200);
    }, DURATIONS[round]);
  };

  // --- LOGIKA ---
  const checkAnswer = (selected: FilmResult) => {
    if (!target) return;
    if (guesses.some(g => g.type === 'film' && g.data?.id === selected.id)) { alert("Już było!"); return; }

    // Porównanie ID z TMDB
    if (selected.id === target.tmdbId) {
       setGameStatus('won'); setBorderColor('border-green-500');
       setResults([]);
    } else {
       setBorderColor('border-red-500'); setShake(true);
       setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
       
       setGuesses(prev => [...prev, { type: 'film', data: selected }]);
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

  const handleShare = () => {
    let grid = "";
    guesses.forEach(g => grid += (g.type === 'skip' ? "⬛" : "🟥"));
    if(gameStatus === 'won') grid += "🟩";
    const used = guesses.length + (gameStatus === 'won' ? 1 : 0);
    for(let i=used; i<6; i++) grid += "⬜";
    navigator.clipboard.writeText(`Film of the Day\n${grid}\n\nZagraj: ...`).then(() => { setShowToast(true); setTimeout(() => setShowToast(false), 3000); });
  };

  // Search TMDB
  useEffect(() => {
    const delay = setTimeout(async () => {
        if (query.length < 2) { setResults([]); return; }
        // Pytamy nasze API z typem 'film'
        const res = await fetch(`/api/search?q=${query}&type=film`);
        const d = await res.json();
        setResults(d.data || []);
    }, 400);
    return () => clearTimeout(delay);
  }, [query]);

  const currentDurationText = (DURATIONS[round] / 1000).toString() + 's';
  if (gameStatus === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Ładowanie...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans relative pb-24">
      {/* TOAST I WSTECZ - skopiuj z innych plików lub zrób komponent */}
      
      <Link href="/" className="absolute top-4 left-4 w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 transition-colors">←</Link>

      <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full shadow-2xl border border-green-500 transition-all duration-500 z-[100] flex items-center gap-3 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <span className="text-green-500 text-xl">🎬</span><span className="font-bold text-sm">Skopiowano!</span>
      </div>

      <div className={`max-w-md w-full bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-200 relative ${borderColor} ${shake ? 'animate-shake' : ''}`}>
        
        <div className="p-5 text-center border-b border-zinc-800 bg-zinc-900/50">
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 tracking-widest uppercase">Film of the Day</h1>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
             
            {/* PLAYER */}
            <div className="relative flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl">
                    <circle cx="64" cy="64" r={54} className="stroke-zinc-700" strokeWidth="6" fill="transparent"/>
                    <circle cx="64" cy="64" r={54} className="stroke-red-500" strokeWidth="6" fill="transparent" strokeLinecap="round"
                    style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE }} />
                </svg>
                <button onClick={playSnippet} disabled={gameStatus !== 'playing'} className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors ${gameStatus !== 'playing' && 'opacity-50'}`}>
                    <span className="text-4xl ml-1 text-white">{isPlaying ? '⏸' : '▶'}</span>
                </button>
                </div>
                <div className="mt-4 text-zinc-400 font-mono text-sm bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800">{isPlaying ? 'Odtwarzanie...' : `Długość: ${currentDurationText}`}</div>
            </div>

            {/* HISTORIA (Z plakatami!) */}
            {guesses.length > 0 && (
                <div className="w-full flex flex-col gap-2">
                    {guesses.map((g, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded bg-zinc-950 border-l-4 border-red-500">
                            {g.type === 'film' && g.data ? (
                                <>
                                    <img src={g.data.poster} className="w-8 h-12 object-cover rounded opacity-50 grayscale" />
                                    <div className="flex-1 min-w-0 opacity-60">
                                        <div className="text-sm font-bold truncate text-zinc-300 line-through">{g.data.title}</div>
                                        <div className="text-xs text-zinc-500">{g.data.year} • {g.data.type === 'movie' ? 'Film' : 'Serial'}</div>
                                    </div>
                                    <span className="text-red-500 font-bold">✕</span>
                                </>
                            ) : (
                                <div className="w-full text-center text-xs font-bold text-zinc-600 uppercase">— SKIP —</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* GAMEPLAY */}
            {gameStatus === 'playing' && (
                <div className="w-full relative">
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Jaki to film?" 
                        className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-red-500 focus:outline-none text-white placeholder-zinc-500"
                    />
                    {results.length > 0 && (
                        <div className="absolute bottom-full mb-2 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                            {results.map(film => (
                                <button key={film.id} onClick={() => checkAnswer(film)} className="w-full text-left p-2 hover:bg-zinc-700 flex items-center gap-3 border-b border-zinc-700/50">
                                    <img src={film.poster} className="w-10 h-14 object-cover rounded" />
                                    <div>
                                        <div className="font-bold text-sm text-white">{film.title}</div>
                                        <div className="text-xs text-zinc-400">{film.year} • {film.type === 'movie' ? 'Film' : 'Serial'}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={handleSkip} className="w-full mt-3 py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition-colors uppercase">Pomiń</button>
                </div>
            )}

            {/* END SCREEN */}
            {gameStatus !== 'playing' && target && (
                <div className="text-center w-full animate-fade-in">
                    <h2 className={`text-2xl font-bold mb-2 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>{gameStatus === 'won' ? 'ZGADŁEŚ!' : 'PORAŻKA'}</h2>
                    <img src={target.poster} className="w-32 mx-auto rounded-lg shadow-lg mb-4" />
                    <p className="text-xl font-bold">{target.title}</p>
                    <button onClick={handleShare} className="mt-6 w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg font-bold text-white hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"><span>📤</span> UDOSTĘPNIJ</button>
                    <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 text-sm text-zinc-400 hover:text-white hover:underline">Zagraj ponownie</button>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}