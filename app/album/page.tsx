'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PixelatedImage from '../components/PixelatedImage';

const PIXEL_FACTORS = [60, 40, 25, 15, 8, 1];

type Album = {
  id: number;
  title: string;
  artist: { name: string };
  cover_xl: string;     // Deezer używa 'cover' dla albumów
  cover_medium: string;
};

type Guess = {
  type: 'album' | 'skip';
  data?: Album;
};

export default function AlbumOfTheDay() {
  const [targetAlbum, setTargetAlbum] = useState<Album | null>(null);
  const [round, setRound] = useState(0);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [shake, setShake] = useState(false);
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  const [showToast, setShowToast] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Album[]>([]);

  useEffect(() => {
    const fetchDaily = async () => {
      try {
        const res = await fetch('/api/daily-album');
        const album = await res.json();
        if (album && album.id) {
          setTargetAlbum(album);
          const savedData = localStorage.getItem('albumGameProgress');
          if (savedData) {
             const parsed = JSON.parse(savedData);
             if (parsed.albumId === album.id) {
                setGuesses(parsed.guesses);
                setRound(parsed.round);
                setGameStatus(parsed.gameStatus);
                if (parsed.gameStatus === 'won') setBorderColor('border-green-500');
                return;
             }
          }
          setGameStatus('playing');
        }
      } catch (error) { console.error(error); }
    };
    fetchDaily();
  }, []);

  useEffect(() => {
    if (targetAlbum && gameStatus !== 'loading') {
      localStorage.setItem('albumGameProgress', JSON.stringify({
        albumId: targetAlbum.id, guesses, round, gameStatus
      }));
    }
  }, [guesses, round, gameStatus, targetAlbum]);

  const triggerFeedback = (type: 'error' | 'success') => {
    if (type === 'success') setBorderColor('border-green-500');
    else {
        setBorderColor('border-red-500');
        setShake(true);
        setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
    }
  };

  const checkAnswer = (selected: Album) => {
    if (!targetAlbum) return;
    if (guesses.some(g => g.type === 'album' && g.data?.id === selected.id)) {
        alert("Już wybierałeś ten album!"); return;
    }
    if (selected.id === targetAlbum.id) {
      setGameStatus('won');
      triggerFeedback('success');
      setResults([]);
    } else {
      triggerFeedback('error');
      setGuesses(prev => [...prev, { type: 'album', data: selected }]);
      if (round < 5) { setRound(round + 1); setQuery(''); setResults([]); } 
      else { setGameStatus('lost'); }
    }
  };

  const handleSkip = () => {
    triggerFeedback('error');
    setGuesses(prev => [...prev, { type: 'skip' }]);
    if (round < 5) setRound(round + 1);
    else setGameStatus('lost');
  };

  const handleShare = () => {
    let emojiGrid = "";
    guesses.forEach(g => emojiGrid += (g.type === 'skip' ? "⬛" : "🟥"));
    if (gameStatus === 'won') emojiGrid += "🟩";
    const usedTurns = guesses.length + (gameStatus === 'won' ? 1 : 0);
    for (let i = usedTurns; i < 6; i++) emojiGrid += "⬜";

    const shareText = `Album of the Day\n${emojiGrid}\n\nZagraj: https://twoja-gra.vercel.app`;
    navigator.clipboard.writeText(shareText).then(() => {
      setShowToast(true); setTimeout(() => setShowToast(false), 3000);
    }).catch(() => alert("Błąd kopiowania"));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < 2) { setResults([]); return; }
      const res = await fetch(`/api/search?q=${query}&type=album`);
      const data = await res.json();
      setResults(data.data || []);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const currentBlur = (gameStatus === 'won' || gameStatus === 'lost') ? 0 : PIXEL_FACTORS[round];

  if (gameStatus === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Ładowanie...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans relative">
      
       <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full shadow-2xl border border-green-500 transition-all duration-500 z-[100] flex items-center gap-3 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <span className="text-green-500 text-xl">💿</span><span className="font-bold text-sm">Skopiowano!</span>
      </div>

      <div className={`max-w-md w-full bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-200 relative ${borderColor} ${shake ? 'animate-shake' : ''}`}>
        <div className="p-5 text-center border-b border-zinc-800 bg-zinc-900/50">
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 tracking-widest uppercase">Album of the Day</h1>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
            <div className="relative w-64 h-64 rounded-xl overflow-hidden shadow-2xl border border-zinc-700 bg-black">
                {/* Obliczamy aktualny poziom pikselizacji */}
                {targetAlbum && (
                    <PixelatedImage
                        src={targetAlbum.cover_xl}
                        // Jeśli koniec gry -> 1 (HD), w przeciwnym razie wg rundy
                        pixelFactor={
                           (gameStatus === 'won' || gameStatus === 'lost') 
                           ? 1 
                           : PIXEL_FACTORS[round]
                        }
                        className="w-full h-full"
                    />
                )}
                
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/10 pointer-events-none">
                    {gameStatus === 'playing' ? `Runda ${round + 1}/6` : 'Koniec'}
                </div>
            </div>

            <div className="flex w-full gap-1 h-1.5">
                {[...Array(6)].map((_, i) => (
                <div key={i} className={`flex-1 rounded-full transition-colors ${i < round ? 'bg-red-500' : i === round ? 'bg-white' : 'bg-zinc-800'}`} />
                ))}
            </div>

            {gameStatus === 'playing' && (
                <div className="w-full relative">
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Jaki to album?" 
                        className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-orange-500 focus:outline-none text-white placeholder-zinc-500"
                    />
                    {results.length > 0 && (
                        <div className="absolute bottom-full mb-2 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                            {results.map(album => (
                                <button key={album.id} onClick={() => checkAnswer(album)} className="w-full text-left p-3 hover:bg-zinc-700 flex items-center gap-3 border-b border-zinc-700/50">
                                    <img src={album.cover_medium} className="w-10 h-10 rounded" />
                                    <div>
                                        <div className="font-bold text-sm">{album.title}</div>
                                        <div className="text-xs text-zinc-500">{album.artist.name}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={handleSkip} className="w-full mt-3 py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition-colors uppercase">Pomiń</button>
                </div>
            )}

            {gameStatus !== 'playing' && targetAlbum && (
                <div className="text-center w-full animate-fade-in">
                    <h2 className={`text-2xl font-bold mb-2 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>{gameStatus === 'won' ? 'ZGADŁEŚ!' : 'PORAŻKA'}</h2>
                    <p className="text-xl font-bold">{targetAlbum.title}</p>
                    <p className="text-sm text-zinc-400">{targetAlbum.artist.name}</p>
                    <button onClick={handleShare} className="mt-6 w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg font-bold text-white hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"><span>📤</span> UDOSTĘPNIJ</button>
                    <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 text-sm text-zinc-400 hover:text-white hover:underline">Zagraj ponownie</button>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}