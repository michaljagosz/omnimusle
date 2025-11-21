'use client';

import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import Link from 'next/link';

const DURATIONS = [500, 1000, 4000, 8000, 16000, 30000];

type Song = {
  id: number;
  title: string;
  artist: { name: string; picture_small: string; };
  preview: string;
};

type Guess = {
  type: 'song' | 'skip';
  data?: Song;
  isClose?: boolean;
};

type SavedGameState = {
  songId: number;
  guesses: Guess[];
  round: number;
  gameStatus: 'loading' | 'playing' | 'won' | 'lost';
};

export default function SongOfTheDay() {
  const RADIUS = 54; const CIRCUMFERENCE = 2 * Math.PI * RADIUS; 
  const [targetSong, setTargetSong] = useState<Song | null>(null);
  const [round, setRound] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [shake, setShake] = useState(false); 
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  const [showToast, setShowToast] = useState(false);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const soundRef = useRef<Howl | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const requestRef = useRef<number>();
  const roundRef = useRef(round); 

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

  // --- INIT & AUTOSAVE ---
  useEffect(() => {
    const initGame = async () => {
      try {
        const res = await fetch('/api/daily');
        const song = await res.json();
        if (song && song.id) {
          setTargetSong(song);
          const savedData = localStorage.getItem('musicGameProgress');
          if (savedData) {
            const parsed: SavedGameState = JSON.parse(savedData);
            if (parsed.songId === song.id) {
              setGuesses(parsed.guesses);
              setRound(parsed.round);
              setGameStatus(parsed.gameStatus);
              if (parsed.gameStatus === 'won') setBorderColor('border-green-500');
              if (parsed.gameStatus === 'playing') initializeAudio(song.preview);
              return;
            }
          }
          setGameStatus('playing');
          initializeAudio(song.preview);
        }
      } catch (error) { console.error("Błąd API:", error); }
    };
    initGame();
    return () => { if (soundRef.current) soundRef.current.unload(); };
  }, []);

  useEffect(() => {
    if (targetSong && gameStatus !== 'loading') {
      const stateToSave: SavedGameState = {
        songId: targetSong.id, guesses, round, gameStatus
      };
      localStorage.setItem('musicGameProgress', JSON.stringify(stateToSave));
    }
  }, [guesses, round, gameStatus, targetSong]);

  // --- AUDIO ---
  const initializeAudio = (src: string) => {
    if (soundRef.current) soundRef.current.unload();
    soundRef.current = new Howl({
      src: [src], html5: true, format: ['mp3'], volume: 0.5,
      onend: stopPlayback, onstop: stopPlayback,
      onplay: () => {
        const updateProgress = () => {
          if (soundRef.current && soundRef.current.playing()) {
            const seek = soundRef.current.seek() as number;
            const duration = DURATIONS[roundRef.current] / 1000; 
            setProgress(Math.min((seek / duration) * 100, 100));
            requestRef.current = requestAnimationFrame(updateProgress);
          }
        };
        requestRef.current = requestAnimationFrame(updateProgress);
      }
    });
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const playSnippet = () => {
    if (gameStatus === 'won' || gameStatus === 'lost') return; 
    if (!soundRef.current && targetSong) initializeAudio(targetSong.preview);
    
    if (isPlaying) {
      soundRef.current?.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      stopPlayback();
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
  const triggerFeedback = (type: 'error' | 'close' | 'success') => {
    if (type === 'success') setBorderColor('border-green-500');
    else if (type === 'close') {
        setBorderColor('border-yellow-500'); setShake(true);
        setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
    } else {
        setBorderColor('border-red-500'); setShake(true);
        setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
    }
  };

  const checkAnswer = (selectedSong: Song) => {
    if (!targetSong) return;
    if (guesses.some(g => g.type === 'song' && g.data?.id === selectedSong.id)) {
        alert("Już było!"); return;
    }
    const isMatch = selectedSong.id === targetSong.id || selectedSong.title.toLowerCase() === targetSong.title.toLowerCase();

    if (isMatch) {
      setGameStatus('won'); setResults([]); triggerFeedback('success');
    } else {
      const isArtistMatch = selectedSong.artist.name.toLowerCase() === targetSong.artist.name.toLowerCase();
      triggerFeedback(isArtistMatch ? 'close' : 'error');
      setGuesses(prev => [...prev, { type: 'song', data: selectedSong, isClose: isArtistMatch }]);
      if (round < 5) { setRound(round + 1); setQuery(''); setResults([]); }
      else setGameStatus('lost');
    }
  };

  const handleSkip = () => {
    triggerFeedback('error');
    setGuesses(prev => [...prev, { type: 'skip', isClose: false }]);
    if (round < 5) setRound(round + 1); else setGameStatus('lost');
  };

  const handleShare = () => {
    let emojiGrid = "";
    guesses.forEach((g) => {
      if (g.type === 'skip') emojiGrid += "⬛";
      else if (g.isClose) emojiGrid += "🟨";
      else emojiGrid += "🟥";
    });
    if (gameStatus === 'won') emojiGrid += "🟩";
    const usedTurns = guesses.length + (gameStatus === 'won' ? 1 : 0);
    for (let i = usedTurns; i < 6; i++) emojiGrid += "⬜";

    const shareText = `Song of the Day\n${emojiGrid}\n\nZagraj: https://twoja-gra.vercel.app`;
    navigator.clipboard.writeText(shareText).then(() => { setShowToast(true); setTimeout(() => setShowToast(false), 3000); });
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

  const currentDurationText = (DURATIONS[round] / 1000).toString() + 's';
  if (gameStatus === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Ładowanie...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans relative pb-24">
      
      {/* TOAST */}
      <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full shadow-2xl border border-green-500 transition-all duration-500 z-[100] flex items-center gap-3 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <span className="text-green-500 text-xl">🎵</span><span className="font-bold text-sm">Skopiowano!</span>
      </div>

      <Link href="/" className="absolute top-4 left-4 w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 transition-colors">←</Link>

      <div className={`max-w-md w-full bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-200 relative ${borderColor} ${shake ? 'animate-shake' : ''}`}>
        
        {/* HEADER */}
        <div className="p-5 text-center border-b border-zinc-800 bg-zinc-900/50">
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 tracking-widest uppercase">Song of the Day</h1>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
          
          {/* PLAYER */}
          <div className="relative flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl">
                <circle cx="64" cy="64" r={RADIUS} className="stroke-zinc-700" strokeWidth="6" fill="transparent"/>
                <circle cx="64" cy="64" r={RADIUS} className="stroke-green-500" strokeWidth="6" fill="transparent" strokeLinecap="round"
                  style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE }}
                />
              </svg>
              <button onClick={playSnippet} disabled={gameStatus === 'lost' || gameStatus === 'won'} className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors ${(gameStatus === 'lost' || gameStatus === 'won') && 'opacity-50 cursor-not-allowed'}`}>
                <span className="text-4xl ml-1 text-white">{isPlaying ? '⏸' : '▶'}</span>
              </button>
            </div>
            <div className="mt-4 text-zinc-400 font-mono text-sm bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800">{isPlaying ? 'Odtwarzanie...' : `Długość: ${currentDurationText}`}</div>
          </div>

          {/* KROPKI */}
          <div className="flex w-full gap-1 h-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`flex-1 rounded-full transition-colors ${i < round ? 'bg-red-500' : i === round ? 'bg-white' : 'bg-zinc-800'}`} />
            ))}
          </div>

          {/* HISTORIA */}
          {guesses.length > 0 && (
            <div className="w-full flex flex-col gap-2 animate-fade-in">
               {guesses.map((g, i) => {
                 const borderClass = g.isClose ? 'border-yellow-500' : 'border-red-500';
                 const titleClass = g.isClose ? 'text-zinc-300' : 'text-zinc-400 line-through';
                 const icon = g.isClose ? '⚠️' : '✕';
                 return (
                 <div key={i} className={`flex items-center gap-3 p-2 rounded bg-zinc-950 border-l-4 ${borderClass}`}>
                    {g.type === 'song' && g.data ? (
                      <>
                        <img src={g.data.artist.picture_small} className={`w-8 h-8 rounded ${!g.isClose && 'opacity-50 grayscale'}`} />
                        <div className="flex-1 min-w-0 opacity-80">
                          <div className={`text-sm truncate ${titleClass}`}>{g.data.title}</div>
                          <div className={`text-xs text-zinc-500`}>{g.data.artist.name}</div>
                        </div>
                        <span className={`text-xs font-bold ${g.isClose ? 'text-yellow-500' : 'text-red-500'}`}>{icon}</span>
                      </>
                    ) : (
                      <div className="w-full text-center text-xs font-bold text-zinc-600 uppercase">— SKIP —</div>
                    )}
                 </div>
               )})}
            </div>
          )}

          {/* GAMEPLAY */}
          {gameStatus === 'playing' && (
            <div className="w-full relative">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jaki to utwór?" 
                className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-green-500 focus:outline-none text-white placeholder-zinc-500"
              />
              {results.length > 0 && (
                <div className="absolute bottom-full mb-2 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                  {results.map((song) => (
                    <button key={song.id} onClick={() => checkAnswer(song)} className="w-full text-left p-3 hover:bg-zinc-700 flex items-center gap-3 border-b border-zinc-700/50">
                      <img src={song.artist.picture_small} className="w-10 h-10 rounded" />
                      <div>
                        <div className="font-bold text-sm text-white">{song.title}</div>
                        <div className="text-xs text-zinc-400">{song.artist.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={handleSkip} className="w-full mt-3 py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition-colors uppercase">Pomiń (+ czas)</button>
            </div>
          )}

          {/* END SCREEN */}
          {gameStatus !== 'playing' && targetSong && (
            <div className="text-center w-full animate-fade-in">
              <h2 className={`text-2xl font-bold mb-2 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>{gameStatus === 'won' ? 'ZGADŁEŚ!' : 'PORAŻKA'}</h2>
              <div className="flex flex-col items-center gap-4 mb-6">
                <img src={targetSong.artist.picture_small} className="w-24 h-24 rounded-lg shadow-lg" />
                <div><p className="text-xl font-bold">{targetSong.title}</p><p className="text-zinc-400">{targetSong.artist.name}</p></div>
              </div>
              {/* UJEDNOLICONY PRZYCISK SHARE */}
              <button onClick={handleShare} className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg font-bold text-white hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"><span>📤</span> UDOSTĘPNIJ WYNIK</button>
              <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 text-sm text-zinc-400 hover:text-white hover:underline">Zagraj ponownie</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}