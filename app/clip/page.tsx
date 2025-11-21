'use client';

import { useState, useEffect, useRef } from 'react';
// Usunąłem import Link, bo nie potrzebujemy już przycisku wstecz
import dynamic from 'next/dynamic'; 
import type { YouTubePlayer } from 'react-youtube'; 

// Ładujemy YouTube tylko po stronie klienta (rozwiązuje błąd "client-side exception")
const YouTube = dynamic(() => import('react-youtube'), { ssr: false });

type ClipData = {
  youtubeId: string;
  timestamps: number[];
  title: string;
  poster: string;
};

type Guess = {
  type: 'clip' | 'skip';
  text?: string; 
};

export default function ClipOfTheDay() {
  const [target, setTarget] = useState<ClipData | null>(null);
  const [round, setRound] = useState(0);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [shake, setShake] = useState(false);
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  const [showToast, setShowToast] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false); // Stan gotowości playera

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const playerRef = useRef<YouTubePlayer | null>(null);

  // --- INICJALIZACJA ---
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/daily-clip');
        const data = await res.json();
        if (data && data.youtubeId) {
          setTarget(data);
          
          // KLUCZOWE: Unikalna nazwa klucza dla tej gry
          const saved = localStorage.getItem('clipGameProgress');
          if (saved) {
            const parsed = JSON.parse(saved);
            // Sprawdzamy po ID wideo
            if (parsed.id === data.youtubeId) {
               setGuesses(parsed.guesses);
               setRound(parsed.round);
               setGameStatus(parsed.gameStatus);
               if (parsed.gameStatus === 'won') setBorderColor('border-green-500');
               return;
            }
          }
          setGameStatus('playing');
        }
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  // --- AUTOSAVE ---
  useEffect(() => {
    if (target && gameStatus !== 'loading') {
      localStorage.setItem('clipGameProgress', JSON.stringify({
        id: target.youtubeId, 
        guesses, 
        round, 
        gameStatus
      }));
    }
  }, [guesses, round, gameStatus, target]);

  // --- PĘTLA WIDEO (LOOP) ---
  useEffect(() => {
    if (!target || !playerRef.current || !isPlayerReady) return;

    const start = target.timestamps[round];
    const end = start + 3; 

    // Bezpieczne przewijanie na start
    try {
      playerRef.current.seekTo(start);
    } catch (e) { console.warn("Seek error", e); }

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === 'function') {
        const curr = player.getCurrentTime();
        // Jeśli wyjdzie poza zakres pętli -> wracamy na start
        if (curr > end || curr < start) {
          player.seekTo(start);
        }
      }
    }, 100); 

    return () => clearInterval(interval);
  }, [round, target, isPlayerReady]); 

  // --- LOGIKA GRY ---
  const triggerFeedback = (type: 'error' | 'success') => {
    if (type === 'success') setBorderColor('border-green-500');
    else {
        setBorderColor('border-red-500');
        setShake(true);
        setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
    }
  };

  const checkAnswer = (selectedSong: any) => {
    if (!target) return;
    
    const keyPhrase = target.title.split(' - ')[1] || target.title; 
    const isCorrect = selectedSong.title.toLowerCase().includes(keyPhrase.toLowerCase());

    if (isCorrect) {
      setGameStatus('won');
      triggerFeedback('success');
      setResults([]);
    } else {
      triggerFeedback('error');
      setGuesses(prev => [...prev, { type: 'clip', text: `${selectedSong.artist.name} - ${selectedSong.title}` }]);
      if (round < 5) { setRound(round + 1); setQuery(''); setResults([]); }
      else setGameStatus('lost');
    }
  };

  const handleSkip = () => {
    triggerFeedback('error');
    setGuesses(prev => [...prev, { type: 'skip' }]);
    if (round < 5) setRound(round + 1); else setGameStatus('lost');
  };

  const handleShare = () => {
    let grid = "";
    guesses.forEach(g => grid += (g.type === 'skip' ? "⬛" : "🟥"));
    if(gameStatus === 'won') grid += "🟩";
    const used = guesses.length + (gameStatus === 'won' ? 1 : 0);
    for(let i=used; i<6; i++) grid += "⬜";
    navigator.clipboard.writeText(`Clip of the Day\n${grid}\n\nZagraj: https://twoja-gra.vercel.app`).then(() => { setShowToast(true); setTimeout(() => setShowToast(false), 3000); });
  };

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (query.length < 2) { setResults([]); return; }
      const res = await fetch(`/api/search?q=${query}&type=track`);
      const d = await res.json();
      setResults(d.data || []);
    }, 400);
    return () => clearTimeout(delay);
  }, [query]);

  const onPlayerReady = (event: any) => {
    playerRef.current = event.target;
    event.target.mute(); 
    event.target.playVideo();
    setIsPlayerReady(true);
    
    if (target) {
        event.target.seekTo(target.timestamps[round]);
    }
  };

  if (gameStatus === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Ładowanie...</div>;

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      mute: 1,
      start: target ? target.timestamps[round] : 0,
    },
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans relative pb-24">
      
      {/* TOAST */}
      <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full shadow-2xl border border-green-500 transition-all duration-500 z-[100] flex items-center gap-3 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <span className="text-green-500 text-xl">📹</span><span className="font-bold text-sm">Skopiowano!</span>
      </div>

      <div className={`max-w-md w-full bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-200 relative ${borderColor} ${shake ? 'animate-shake' : ''}`}>
        
        <div className="p-5 text-center border-b border-zinc-800 bg-zinc-900/50">
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-widest uppercase">Clip of the Day</h1>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
            
            {/* EKRAN TV */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-zinc-700 shadow-2xl">
                {target && (
                    <div className="w-full h-full relative pointer-events-none select-none overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] opacity-80">
                             <YouTube 
                                videoId={target.youtubeId} 
                                opts={opts} 
                                onReady={onPlayerReady}
                                className="w-full h-full"
                             />
                        </div>
                        <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/zootella/crt-css/master/scanline.png')] opacity-20 pointer-events-none"></div>
                    </div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/10 z-20">
                   {gameStatus === 'playing' ? `Runda ${round + 1}/6` : 'Koniec'}
                </div>
            </div>

            {/* KROPKI RUND */}
            <div className="flex w-full gap-1 h-1.5">
                {[...Array(6)].map((_, i) => (
                <div key={i} className={`flex-1 rounded-full transition-colors ${i < round ? 'bg-red-500' : i === round ? 'bg-white' : 'bg-zinc-800'}`} />
                ))}
            </div>

            {/* ROZGRYWKA */}
            {gameStatus === 'playing' && (
                <div className="w-full relative">
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Jaki to teledysk?" 
                        className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-indigo-500 focus:outline-none text-white placeholder-zinc-500"
                    />
                    {results.length > 0 && (
                        <div className="absolute bottom-full mb-2 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                            {results.map(song => (
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
                    <button onClick={handleSkip} className="w-full mt-3 py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition-colors uppercase">Pomiń (+ inny fragment)</button>
                </div>
            )}

            {/* EKRAN KOŃCOWY */}
            {gameStatus !== 'playing' && target && (
                <div className="text-center w-full animate-fade-in">
                    <h2 className={`text-2xl font-bold mb-2 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>{gameStatus === 'won' ? 'ZGADŁEŚ!' : 'PORAŻKA'}</h2>
                    <img src={target.poster} className="w-32 mx-auto rounded shadow-lg mb-4" />
                    <p className="text-xl font-bold">{target.title}</p>
                    
                    <button onClick={handleShare} className="mt-6 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-bold text-white hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"><span>📤</span> UDOSTĘPNIJ WYNIK</button>
                    <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 text-sm text-zinc-400 hover:text-white hover:underline">Zagraj ponownie</button>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}