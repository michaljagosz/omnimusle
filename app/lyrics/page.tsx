'use client';

import { useState, useEffect } from 'react';
import GameWrapper from '../components/GameWrapper';
import Link from 'next/link';
import Countdown from '../components/Countdown';

type LyricGameData = {
  id: number;
  title: string;
  artist: { name: string; picture_small: string };
  album: { cover_medium: string };
  lines: string[];
};

type SongResult = {
  id: number;
  title: string;
  artist: { name: string; picture_small: string };
};

type Guess = {
  type: 'song' | 'skip';
  data?: SongResult;
  isClose?: boolean;
};

export default function LyricsOfTheDay() {
  const [target, setTarget] = useState<LyricGameData | null>(null);
  const [round, setRound] = useState(0);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [shake, setShake] = useState(false);
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  const [showToast, setShowToast] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/daily-lyrics');
        if (!res.ok) throw new Error('Błąd pobierania');
        const data = await res.json();
        if (data && data.id && data.lines) {
          setTarget(data);
          const saved = localStorage.getItem('lyricsGameProgress');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.id === data.id) {
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

  useEffect(() => {
    if (target && gameStatus !== 'loading') {
      localStorage.setItem('lyricsGameProgress', JSON.stringify({
        id: target.id, guesses, round, gameStatus
      }));
    }
  }, [guesses, round, gameStatus, target]);

  const triggerFeedback = (type: 'error' | 'close' | 'success') => {
    if (type === 'success') setBorderColor('border-green-500');
    else if (type === 'close') {
        setBorderColor('border-yellow-500');
        setShake(true);
        setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
    } else {
        setBorderColor('border-red-500');
        setShake(true);
        setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
    }
  };

  const checkAnswer = (selected: SongResult) => {
    if (!target) return;
    if (guesses.some(g => g.type === 'song' && g.data?.id === selected.id)) {
        alert("Already guessed!"); return;
    }

    const isExact = selected.id === target.id || selected.title.toLowerCase() === target.title.toLowerCase();

    if (isExact) {
      setGameStatus('won');
      triggerFeedback('success');
      setResults([]);
    } else {
      const isArtist = selected.artist.name.toLowerCase() === target.artist.name.toLowerCase();
      triggerFeedback(isArtist ? 'close' : 'error');
      setGuesses(prev => [...prev, { type: 'song', data: selected, isClose: isArtist }]);
      if (round < 5) { setRound(round + 1); setQuery(''); setResults([]); }
      else setGameStatus('lost');
    }
  };

  const handleSkip = () => {
    triggerFeedback('error');
    setGuesses(prev => [...prev, { type: 'skip' }]);
    if (round < 5) setRound(round + 1);
    else setGameStatus('lost');
  };

  const handleShare = () => {
    let grid = "";
    guesses.forEach(g => {
        if (g.type === 'skip') grid += "⬛";
        else if (g.isClose) grid += "🟨";
        else grid += "🟥";
    });
    if (gameStatus === 'won') grid += "🟩";
    const used = guesses.length + (gameStatus === 'won' ? 1 : 0);
    for (let i = used; i < 6; i++) grid += "⬜";
    
    const text = `Lyrics of the Day\n${grid}\n\nPlay: https://twoja-gra.vercel.app`;
    navigator.clipboard.writeText(text).then(() => { setShowToast(true); setTimeout(() => setShowToast(false), 3000); });
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

  if (gameStatus === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans relative pb-24">
      
      <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full shadow-2xl border border-green-500 transition-all duration-500 z-[100] flex items-center gap-3 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <span className="text-green-500 text-xl">📝</span><span className="font-bold text-sm">Copied to clipboard!</span>
      </div>
      
      <GameWrapper
        title="Lyrics of the Day"
        icon="📝"
        gradientFrom="from-cyan-400"
        gradientTo="to-blue-600"
        borderColor={borderColor}
        shake={shake}
      >
            {/* TEKST */}
            <div className="w-full min-h-[200px] bg-zinc-950 rounded-xl border border-zinc-800 p-6 flex flex-col items-center justify-center gap-3 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/50 pointer-events-none" />
                {target && target.lines.map((line, index) => {
                    const isVisible = index <= round || gameStatus === 'won' || gameStatus === 'lost';
                    return (
                        <div 
                            key={index} 
                            className={`text-center font-medium transition-all duration-700 
                                ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-4 blur-sm'}
                                ${index === round && gameStatus === 'playing' ? 'text-cyan-400 scale-105 font-bold' : 'text-zinc-300'}
                            `}
                        >
                            {isVisible ? `"${line}"` : '...'}
                        </div>
                    );
                })}
            </div>

            {/* PASKI RUND */}
            <div className="flex w-full gap-1 h-1.5">
                {[...Array(6)].map((_, i) => (
                <div key={i} className={`flex-1 rounded-full transition-colors ${i < round ? 'bg-red-500' : i === round ? 'bg-white' : 'bg-zinc-800'}`} />
                ))}
            </div>

            {/* HISTORIA - PRZYWRÓCONA! */}
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

            {/* GAMEPLAY */}
            {gameStatus === 'playing' && (
                <div className="w-full relative">
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for a song..." 
                        className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-cyan-500 focus:outline-none text-white placeholder-zinc-500 transition-all"
                    />
                    {results.length > 0 && (
                        <div className="absolute bottom-full mb-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                            {results.map(song => (
                                <button key={song.id} onClick={() => checkAnswer(song)} className="w-full text-left p-3 hover:bg-zinc-800 flex items-center gap-3 border-b border-zinc-800 transition-colors">
                                    <img src={song.artist.picture_small} className="w-10 h-10 rounded" />
                                    <div>
                                        <div className="font-bold text-sm text-white">{song.title}</div>
                                        <div className="text-xs text-zinc-400">{song.artist.name}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={handleSkip} className="w-full mt-3 py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition-colors uppercase">SKIP (+ LINE)</button>
                </div>
            )}

            {gameStatus !== 'playing' && target && (
                <div className="text-center w-full animate-fade-in pt-4 border-t border-zinc-800">
                    <h2 className={`text-2xl font-bold mb-2 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>{gameStatus === 'won' ? 'VICTORY' : 'GAME OVER'}</h2>
                    <img src={target.album.cover_medium} className="w-32 h-32 rounded mx-auto mb-4 shadow-lg" />
                    <p className="text-xl font-bold text-white">{target.title}</p>
                    <p className="text-sm text-zinc-400 mb-6">{target.artist.name}</p>
                    <button onClick={handleShare} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold text-white hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"><span>📤</span> SHARE RESULT</button>
                    <Countdown />
                </div>
            )}
      </GameWrapper>
    </main>
  );
}