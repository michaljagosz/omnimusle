'use client';

import { useState, useEffect } from 'react';
import PixelatedImage from '../components/PixelatedImage';
import GameWrapper from '../components/GameWrapper';
import Countdown from '../components/Countdown';

const PIXEL_FACTORS = [60, 40, 25, 15, 8, 1];

type Artist = {
  id: number;
  name: string;
  picture_xl: string;
  picture_medium: string;
};

type Guess = {
  type: 'artist' | 'skip';
  data?: Artist;
};

export default function ArtistOfTheDay() {
  const [targetArtist, setTargetArtist] = useState<Artist | null>(null);
  const [round, setRound] = useState(0);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [shake, setShake] = useState(false);
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  const [showToast, setShowToast] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Artist[]>([]);

  useEffect(() => {
    const fetchDailyArtist = async () => {
      try {
        const res = await fetch('/api/daily-artist');
        const artist = await res.json();
        if (artist && artist.id) {
          setTargetArtist(artist);
          const savedData = localStorage.getItem('artistGameProgress');
          if (savedData) {
             const parsed = JSON.parse(savedData);
             if (parsed.artistId === artist.id) {
                setGuesses(parsed.guesses);
                setRound(parsed.round);
                setGameStatus(parsed.gameStatus);
                if (parsed.gameStatus === 'won') setBorderColor('border-green-500');
                return;
             }
          }
          setGameStatus('playing');
        }
      } catch (error) { console.error("Błąd:", error); }
    };
    fetchDailyArtist();
  }, []);

  useEffect(() => {
    if (targetArtist && gameStatus !== 'loading') {
      localStorage.setItem('artistGameProgress', JSON.stringify({
        artistId: targetArtist.id, guesses, round, gameStatus
      }));
    }
  }, [guesses, round, gameStatus, targetArtist]);

  const triggerFeedback = (type: 'error' | 'success') => {
    if (type === 'success') {
        setBorderColor('border-green-500');
    } else {
        setBorderColor('border-red-500');
        setShake(true);
        setTimeout(() => { setShake(false); setBorderColor('border-zinc-700'); }, 500);
    }
  };

  const checkAnswer = (selectedArtist: Artist) => {
    if (!targetArtist) return;
    if (guesses.some(g => g.type === 'artist' && g.data?.id === selectedArtist.id)) {
        alert("Already guessed!"); return;
    }

    if (selectedArtist.id === targetArtist.id) {
      setGameStatus('won');
      triggerFeedback('success');
      setResults([]);
    } else {
      triggerFeedback('error');
      setGuesses(prev => [...prev, { type: 'artist', data: selectedArtist }]);
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
    guesses.forEach((g) => { emojiGrid += g.type === 'skip' ? "⬛" : "🟥"; });
    if (gameStatus === 'won') emojiGrid += "🟩";
    const usedTurns = guesses.length + (gameStatus === 'won' ? 1 : 0);
    for (let i = usedTurns; i < 6; i++) emojiGrid += "⬜";

    const shareText = `Artist of the Day\n${emojiGrid}\n\nPlay: https://twoja-gra.vercel.app`;
    navigator.clipboard.writeText(shareText).then(() => {
      setShowToast(true); setTimeout(() => setShowToast(false), 3000);
    }).catch(err => { alert("Copy failed."); });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < 2) { setResults([]); return; }
      try {
        const res = await fetch(`/api/search?q=${query}&type=artist`);
        const data = await res.json();
        setResults(data.data || []);
      } catch (error) { console.error(error); }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  if (gameStatus === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans relative pb-24">
      
      <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full shadow-2xl border border-green-500 transition-all duration-500 z-[100] flex items-center gap-3 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <span className="text-green-500 text-xl">🎨</span><span className="font-bold text-sm">Copied to clipboard!</span>
      </div>

      <GameWrapper
        title="Artist of the Day"
        icon="👨‍🎤"
        gradientFrom="from-purple-400"
        gradientTo="to-pink-600"
        borderColor={borderColor}
        shake={shake}
      >
        <div className="relative w-64 h-64 rounded-xl overflow-hidden shadow-2xl border border-zinc-700 bg-black">
            {targetArtist && (
                <PixelatedImage
                    src={targetArtist.picture_xl}
                    pixelFactor={(gameStatus === 'won' || gameStatus === 'lost') ? 1 : PIXEL_FACTORS[round]}
                    className="w-full h-full"
                />
            )}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/10 pointer-events-none">
                {gameStatus === 'playing' ? `Round ${round + 1}/6` : 'End'}
            </div>
        </div>

        <div className="flex w-full gap-1 h-1.5">
            {[...Array(6)].map((_, i) => (
            <div key={i} className={`flex-1 rounded-full transition-colors ${i < round ? 'bg-red-500' : i === round ? 'bg-white' : 'bg-zinc-800'}`} />
            ))}
        </div>

        {/* HISTORY */}
        {guesses.length > 0 && (
          <div className="w-full flex flex-col gap-2 animate-fade-in">
            {guesses.map((g, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded bg-zinc-950 border-l-4 border-red-500"
              >
                {g.type === 'artist' && g.data ? (
                  <>
                    <img
                      src={g.data.picture_medium}
                      className="w-8 h-8 rounded opacity-50 grayscale"
                    />
                    <div className="flex-1 min-w-0 opacity-80">
                      <div className="text-sm truncate text-zinc-400 line-through">
                        {g.data.name}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-red-500">✕</span>
                  </>
                ) : (
                  <div className="w-full text-center text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    — SKIP —
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {gameStatus === 'playing' && (
            <div className="w-full relative">
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for an artist..." 
                    className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-purple-500 focus:outline-none text-white placeholder-zinc-500 transition-all"
                />
                {results.length > 0 && (
                    <div className="absolute bottom-full mb-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                        {results.map(artist => (
                            <button key={artist.id} onClick={() => checkAnswer(artist)} className="w-full text-left p-3 hover:bg-zinc-800 flex items-center gap-3 border-b border-zinc-800 transition-colors">
                                <img src={artist.picture_medium} className="w-10 h-10 rounded-full" />
                                <span className="font-bold text-sm">{artist.name}</span>
                            </button>
                        ))}
                    </div>
                )}
                <button onClick={handleSkip} className="w-full mt-3 py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition-colors uppercase">SKIP (+ CLARITY)</button>
            </div>
        )}

        {gameStatus !== 'playing' && targetArtist && (
            <div className="text-center w-full animate-fade-in pt-4 border-t border-zinc-800">
                <h2 className={`text-2xl font-bold mb-2 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>{gameStatus === 'won' ? 'VICTORY' : 'GAME OVER'}</h2>
                <p className="text-xl font-bold text-white mb-6">{targetArtist.name}</p>
                <button onClick={handleShare} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold text-white hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"><span>📤</span> SHARE RESULT</button>
                <Countdown />
            </div>
        )}
      </GameWrapper>
    </main>
  );
}