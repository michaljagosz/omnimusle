'use client';

import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import GameWrapper from '../components/GameWrapper';
import CircularPlayer from '../components/CircularPlayer';
import Countdown from '../components/Countdown';

const DURATIONS = [500, 1000, 4000, 8000, 16000, 30000];

type FilmResult = {
  id: number;
  title: string;
  poster: string;
  year: string;
  type: 'movie' | 'tv';
};

type DailyFilmPuzzle = {
  tmdbId: number;
  title: string;
  audioPreview: string;
  poster: string;
};

type Guess = {
  type: 'film' | 'skip';
  data?: FilmResult;
  isClose?: boolean;
};

export default function FilmOfTheDay() {
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  const [shake, setShake] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [target, setTarget] = useState<DailyFilmPuzzle | null>(null);
  const [round, setRound] = useState(0);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FilmResult[]>([]);
  
  const soundRef = useRef<Howl | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const requestRef = useRef<number | null>(null);
  // WAŻNE: Refy do śledzenia czasu i rundy wewnątrz pętli animacji
  const roundRef = useRef(round);
  const startTimeRef = useRef<number>(0);

  useEffect(() => { roundRef.current = round; }, [round]);

  // --- DYNAMICZNE WYDŁUŻANIE CZASU (AUDIO) ---
  useEffect(() => {
    if (isPlaying && soundRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const currentSeek = soundRef.current.seek() as number;
      const remainingMs = DURATIONS[round] - (currentSeek * 1000);
      
      timerRef.current = setTimeout(() => {
        soundRef.current?.fade(0.5, 0, 200);
        setTimeout(() => { 
            stopPlayback(); 
            soundRef.current?.volume(0.5); 
        }, 200);
      }, Math.max(0, remainingMs));
    }
  }, [round]); // Reaguje na zmianę rundy (Skip)

  // --- INICJALIZACJA ---
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/daily-film');
        const data = await res.json();
        if (data && data.tmdbId) {
          setTarget(data);
          const saved = localStorage.getItem('filmGameProgress');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.id === data.tmdbId) {
               setGuesses(parsed.guesses);
               setRound(parsed.round);
               setGameStatus(parsed.gameStatus);
               if (parsed.gameStatus === 'won') setBorderColor('border-green-500');
               if (parsed.gameStatus === 'playing') initAudio(data.audioPreview);
               return;
            }
          }
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

  // --- AUDIO LOGIC ---
  const initAudio = (src: string) => {
    if (soundRef.current) soundRef.current.unload();
    soundRef.current = new Howl({
      src: [src], html5: true, format: ['mp3'], volume: 0.5,
      onend: stopPlayback,
      onstop: stopPlayback
    });
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setProgress(0);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    soundRef.current?.stop();
  };

  const playSnippet = () => {
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    
    // Jeśli nie ma audio (np. błąd ładowania), spróbuj załadować ponownie
    if (!soundRef.current && target) initAudio(target.audioPreview);

    if (isPlaying) {
        stopPlayback();
        return;
    }

    setIsPlaying(true);
    soundRef.current?.seek(0);
    soundRef.current?.volume(0.5);
    soundRef.current?.play();

    // Zapisujemy czas startu
    startTimeRef.current = performance.now();

    const tick = () => {
      // Obliczamy czas na podstawie zegara systemowego (płynniej niż pytać audio)
      const elapsed = performance.now() - startTimeRef.current;
      
      // KLUCZOWA POPRAWKA: Pobieramy duration z Refa, a nie ze zmiennej lokalnej!
      // Dzięki temu po Skipie pasek "wie", że ma więcej czasu.
      const currentRoundDuration = DURATIONS[roundRef.current];
      
      const pct = Math.min((elapsed / currentRoundDuration) * 100, 100);
      setProgress(pct);

      if (elapsed < currentRoundDuration) {
        requestRef.current = requestAnimationFrame(tick);
      } else {
        // Koniec czasu (zapasowy stop, główny jest w timerze)
        stopPlayback();
      }
    };
    requestRef.current = requestAnimationFrame(tick);
  };

  // --- LOGIKA GRY ---
  const checkAnswer = (selected: FilmResult) => {
    if (!target) return;
    if (guesses.some(g => g.type === 'film' && g.data?.id === selected.id)) { alert("Already guessed!"); return; }

    if (selected.id === target.tmdbId) {
       setGameStatus('won'); setBorderColor('border-green-500'); setResults([]);
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
    navigator.clipboard.writeText(`Film of the Day\n${grid}\n\nPlay: https://twoja-gra.vercel.app`).then(() => { setShowToast(true); setTimeout(() => setShowToast(false), 3000); });
  };

  // Search TMDB
  useEffect(() => {
    const delay = setTimeout(async () => {
        if (query.length < 2) { setResults([]); return; }
        const res = await fetch(`/api/search?q=${query}&type=film`);
        const d = await res.json();
        setResults(d.data || []);
    }, 400);
    return () => clearTimeout(delay);
  }, [query]);

  const currentDurationText = (DURATIONS[round] / 1000).toString() + 's';
  if (gameStatus === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans relative pb-24">
      
      <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full shadow-2xl border border-green-500 transition-all duration-500 z-[100] flex items-center gap-3 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <span className="text-green-500 text-xl">🎬</span><span className="font-bold text-sm">Copied to clipboard!</span>
      </div>

      <GameWrapper
        title="Film of the Day"
        icon="🎬"
        gradientFrom="from-red-500"
        gradientTo="to-orange-500"
        borderColor={borderColor}
        shake={shake}
      >
          <div className="flex flex-col items-center gap-2">
            <CircularPlayer 
                isPlaying={isPlaying}
                progress={progress}
                onToggle={playSnippet} 
                disabled={gameStatus === 'won' || gameStatus === 'lost'}
                colorClass="stroke-red-500"
            />
            <div className="text-zinc-500 font-mono text-xs bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
                {isPlaying ? 'Playing...' : `Length: ${currentDurationText}`}
            </div>
          </div>

          {/* PASKI RUND */}
          <div className="flex w-full gap-1 h-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`flex-1 rounded-full transition-colors ${i < round ? 'bg-red-500' : i === round ? 'bg-white' : 'bg-zinc-800'}`} />
            ))}
          </div>

          {/* HISTORIA */}
          {guesses.length > 0 && (
              <div className="w-full flex flex-col gap-2 animate-fade-in">
                  {guesses.map((g, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded bg-zinc-950 border-l-4 border-red-500">
                          {g.type === 'film' && g.data ? (
                              <>
                                  <img src={g.data.poster} className="w-8 h-12 object-cover rounded opacity-50 grayscale" />
                                  <div className="flex-1 min-w-0 opacity-60">
                                      <div className="text-sm font-bold truncate text-zinc-300 line-through">{g.data.title}</div>
                                      <div className="text-xs text-zinc-500">{g.data.year} • {g.data.type === 'movie' ? 'Movie' : 'TV'}</div>
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
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for a movie..." 
                      className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-red-500 focus:outline-none text-white placeholder-zinc-500 transition-all"
                  />
                  {results.length > 0 && (
                      <div className="absolute bottom-full mb-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                          {results.map(film => (
                              <button key={film.id} onClick={() => checkAnswer(film)} className="w-full text-left p-2 hover:bg-zinc-800 flex items-center gap-3 border-b border-zinc-800 transition-colors">
                                  <img src={film.poster} className="w-10 h-14 object-cover rounded" />
                                  <div>
                                      <div className="font-bold text-sm text-white">{film.title}</div>
                                      <div className="text-xs text-zinc-400">{film.year} • {film.type === 'movie' ? 'Movie' : 'TV'}</div>
                                  </div>
                              </button>
                          ))}
                      </div>
                  )}
                  <button onClick={handleSkip} className="w-full mt-3 py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition-colors uppercase">SKIP (+ TIME)</button>
              </div>
          )}

          {/* END */}
          {gameStatus !== 'playing' && target && (
              <div className="text-center w-full animate-fade-in pt-4 border-t border-zinc-800">
                  <h2 className={`text-2xl font-bold mb-2 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>{gameStatus === 'won' ? 'VICTORY' : 'GAME OVER'}</h2>
                  <img src={target.poster} className="w-32 mx-auto rounded-lg shadow-lg mb-4" />
                  <p className="text-xl font-bold text-white">{target.title}</p>
                  <button onClick={handleShare} className="mt-6 w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg font-bold text-white hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"><span>📤</span> SHARE RESULT</button>
                  <Countdown />
              </div>
          )}
      </GameWrapper>
    </main>
  );
}