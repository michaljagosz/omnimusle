'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PixelatedImage from '../components/PixelatedImage';

// --- KONFIGURACJA BLURA ---
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
  // --- STAN GRY ---
  const [targetArtist, setTargetArtist] = useState<Artist | null>(null);
  const [round, setRound] = useState(0);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [shake, setShake] = useState(false);
  const [borderColor, setBorderColor] = useState('border-zinc-700');
  
  // Powiadomienie Toast
  const [showToast, setShowToast] = useState(false);

  // Wyszukiwarka
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Artist[]>([]);

  // --- 1. INICJALIZACJA ---
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
      } catch (error) {
        console.error("Błąd:", error);
      }
    };
    fetchDailyArtist();
  }, []);

  // --- 2. AUTOSAVE ---
  useEffect(() => {
    if (targetArtist && gameStatus !== 'loading') {
      localStorage.setItem('artistGameProgress', JSON.stringify({
        artistId: targetArtist.id,
        guesses, round, gameStatus
      }));
    }
  }, [guesses, round, gameStatus, targetArtist]);

  // --- LOGIKA GRY ---
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
        alert("Już wybierałeś tego artystę!");
        return;
    }

    if (selectedArtist.id === targetArtist.id) {
      setGameStatus('won');
      triggerFeedback('success');
      setResults([]);
    } else {
      triggerFeedback('error');
      setGuesses(prev => [...prev, { type: 'artist', data: selectedArtist }]);
      
      if (round < 5) {
        setRound(round + 1);
        setQuery('');
        setResults([]);
      } else {
        setGameStatus('lost');
      }
    }
  };

  const handleSkip = () => {
    triggerFeedback('error');
    setGuesses(prev => [...prev, { type: 'skip' }]);
    if (round < 5) {
        setRound(round + 1);
    } else {
        setGameStatus('lost');
    }
  };

  // --- UDOSTĘPNIANIE (SHARE) ---
  const handleShare = () => {
    let emojiGrid = "";
    
    // Budowanie kratek (podobnie jak w Song, ale bez "żółtych", bo tu nie ma bliskich trafień)
    guesses.forEach((g) => {
      emojiGrid += g.type === 'skip' ? "⬛" : "🟥";
    });

    if (gameStatus === 'won') {
      emojiGrid += "🟩";
    }

    const usedTurns = guesses.length + (gameStatus === 'won' ? 1 : 0);
    for (let i = usedTurns; i < 6; i++) {
      emojiGrid += "⬜";
    }

    const dateStr = new Date().toLocaleDateString('pl-PL');
    const shareText = `Artist of the Day (${dateStr})\n${emojiGrid}\n\nZagraj tutaj: https://twoja-gra.vercel.app`;

    navigator.clipboard.writeText(shareText).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }).catch(err => {
      alert("Nie udało się skopiować wyniku.");
    });
  };

  // Wyszukiwarka
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < 2) { setResults([]); return; }
      
      try {
        const res = await fetch(`/api/search?q=${query}&type=artist`);
        const data = await res.json();
        setResults(data.data || []);
      } catch (error) {
        console.error("Błąd wyszukiwania:", error);
      }

    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const currentBlur = (gameStatus === 'won' || gameStatus === 'lost') ? 0 : PIXEL_FACTORS[round];

  if (gameStatus === 'loading') return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Ładowanie...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans relative">
      
      {/* TOAST */}
      <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-full shadow-2xl border border-green-500 transition-all duration-500 z-[100] flex items-center gap-3
         ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
      `}>
        <span className="text-green-500 text-xl">🎨</span>
        <span className="font-bold text-sm">Skopiowano wynik do schowka!</span>
      </div>

      <Link href="/" className="absolute top-4 left-4 w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">←</Link>

      <div className={`max-w-md w-full bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-200 relative ${borderColor} ${shake ? 'animate-shake' : ''}`}>
        
        <div className="p-5 text-center border-b border-zinc-800 bg-zinc-900/50">
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-widest uppercase">Artist of the Day</h1>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
            
            <div className="relative w-64 h-64 rounded-xl overflow-hidden shadow-2xl border border-zinc-700 bg-black">
                {/* Obliczamy aktualny poziom pikselizacji */}
                {targetArtist && (
                    <PixelatedImage
                        src={targetArtist.picture_xl}
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
                    <input 
                        type="text" 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Kto to jest?" 
                        className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-700 focus:border-purple-500 focus:outline-none text-white placeholder-zinc-500"
                    />
                    
                    {results.length > 0 && (
                        <div className="absolute bottom-full mb-2 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                            {results.map(artist => (
                                <button key={artist.id} onClick={() => checkAnswer(artist)} className="w-full text-left p-3 hover:bg-zinc-700 flex items-center gap-3 border-b border-zinc-700/50">
                                    <img src={artist.picture_medium} className="w-10 h-10 rounded-full" />
                                    <span className="font-bold text-sm">{artist.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <button onClick={handleSkip} className="w-full mt-3 py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition-colors uppercase">
                        Pomiń (+ lepsza widoczność)
                    </button>
                </div>
            )}

            {gameStatus !== 'playing' && targetArtist && (
                <div className="text-center w-full animate-fade-in">
                    <h2 className={`text-2xl font-bold mb-2 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                        {gameStatus === 'won' ? 'ZGADŁEŚ!' : 'PORAŻKA'}
                    </h2>
                    <p className="text-xl font-bold">{targetArtist.name}</p>
                    
                    {/* SHARE BUTTON */}
                    <button 
                        onClick={handleShare}
                        className="mt-6 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold text-white hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"
                    >
                        <span>📤</span> UDOSTĘPNIJ WYNIK
                    </button>

                    <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 text-sm text-zinc-400 hover:text-white hover:underline">
                        Zagraj ponownie
                    </button>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}