'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  // Stan przechowujący status ukończenia dla KAŻDEJ gry osobno
  const [status, setStatus] = useState({
    song: false,
    artist: false,
    album: false,
    lyrics: false,
    film: false,
    clip: false,
  });

  useEffect(() => {
    // Funkcja pomocnicza do sprawdzania LocalStorage
    const checkGameStatus = (key: string) => {
      const savedData = localStorage.getItem(key);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Gra jest "ukończona" jeśli wygraliśmy lub przegraliśmy (nie 'playing' i nie 'loading')
        return parsed.gameStatus === 'won' || parsed.gameStatus === 'lost';
      }
      return false;
    };

    // Sprawdzamy wszystkie klucze, które stworzyliśmy w poprzednich krokach
    setStatus({
      song: checkGameStatus('musicGameProgress'),
      artist: checkGameStatus('artistGameProgress'),
      album: checkGameStatus('albumGameProgress'),
      lyrics: checkGameStatus('lyricsGameProgress'),
      film: checkGameStatus('filmGameProgress'),
      clip: checkGameStatus('clipGameProgress'),
    });
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 font-sans selection:bg-green-500 selection:text-white">
      
      {/* NAGŁÓWEK */}
      <header className="max-w-2xl mx-auto pt-10 pb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          OMNI<span className="text-white">MUSLE</span>
        </h1>
        <p className="text-zinc-400 text-lg">Codzienne wyzwania dla fanów muzyki</p>
      </header>

      {/* GRID Z GRAMI */}
      <div className="max-w-md mx-auto grid gap-4">
        
        {/* KARTA 1: SONG */}
        <Link href="/song" className="group relative block">
          <div className={`absolute inset-0 rounded-2xl blur opacity-25 transition-opacity group-hover:opacity-50 
            ${status.song ? 'bg-green-500' : 'bg-blue-600'}`} 
          />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                ${status.song ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'}`}>
                🎵
              </div>
              <div>
                <h2 className="text-xl font-bold group-hover:text-blue-400 transition-colors">Song of the Day</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Odgadnij utwór</p>
              </div>
            </div>
            {status.song ? (
              <span className="text-green-500 font-bold text-sm bg-green-900/30 px-3 py-1 rounded-full">UKOŃCZONE</span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">→</span>
            )}
          </div>
        </Link>

        {/* KARTA 2: ARTIST */}
        <Link href="/artist" className="group relative block">
          <div className={`absolute inset-0 rounded-2xl blur opacity-25 transition-opacity group-hover:opacity-50 
            ${status.artist ? 'bg-green-500' : 'bg-purple-600'}`} 
          />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                ${status.artist ? 'bg-green-900/50 text-green-400' : 'bg-purple-900/50 text-purple-400'}`}>
                👨‍🎤
              </div>
              <div>
                <h2 className="text-xl font-bold group-hover:text-purple-400 transition-colors">Artist of the Day</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Odgadnij zdjęcie</p>
              </div>
            </div>
            {status.artist ? (
              <span className="text-green-500 font-bold text-sm bg-green-900/30 px-3 py-1 rounded-full">UKOŃCZONE</span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">→</span>
            )}
          </div>
        </Link>

        {/* KARTA 3: ALBUM */}
        <Link href="/album" className="group relative block">
          <div className={`absolute inset-0 rounded-2xl blur opacity-25 transition-opacity group-hover:opacity-50 
            ${status.album ? 'bg-green-500' : 'bg-yellow-600'}`} 
          />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                ${status.album ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                💿
              </div>
              <div>
                <h2 className="text-xl font-bold group-hover:text-yellow-400 transition-colors">Album of the Day</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Odgadnij okładkę</p>
              </div>
            </div>
            {status.album ? (
              <span className="text-green-500 font-bold text-sm bg-green-900/30 px-3 py-1 rounded-full">UKOŃCZONE</span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-yellow-600 group-hover:text-white transition-colors">→</span>
            )}
          </div>
        </Link>

        {/* KARTA 4: LYRICS */}
        <Link href="/lyrics" className="group relative block">
          <div className={`absolute inset-0 rounded-2xl blur opacity-25 transition-opacity group-hover:opacity-50 
            ${status.lyrics ? 'bg-green-500' : 'bg-cyan-600'}`} 
          />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                ${status.lyrics ? 'bg-green-900/50 text-green-400' : 'bg-cyan-900/50 text-cyan-400'}`}>
                📝
              </div>
              <div>
                <h2 className="text-xl font-bold group-hover:text-cyan-400 transition-colors">Lyrics of the Day</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Odgadnij słowa</p>
              </div>
            </div>
            {status.lyrics ? (
              <span className="text-green-500 font-bold text-sm bg-green-900/30 px-3 py-1 rounded-full">UKOŃCZONE</span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-colors">→</span>
            )}
          </div>
        </Link>

        {/* KARTA 5: FILM */}
        <Link href="/film" className="group relative block">
          <div className={`absolute inset-0 rounded-2xl blur opacity-25 transition-opacity group-hover:opacity-50 
            ${status.film ? 'bg-green-500' : 'bg-red-600'}`} 
          />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                ${status.film ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                🎬
              </div>
              <div>
                <h2 className="text-xl font-bold group-hover:text-red-400 transition-colors">Film of the Day</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Odgadnij film lub serial</p>
              </div>
            </div>
            {status.film ? (
              <span className="text-green-500 font-bold text-sm bg-green-900/30 px-3 py-1 rounded-full">UKOŃCZONE</span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">→</span>
            )}
          </div>
        </Link>

        {/* KARTA 6: CLIP */}
        <Link href="/clip" className="group relative block">
          <div className={`absolute inset-0 rounded-2xl blur opacity-25 transition-opacity group-hover:opacity-50 
            ${status.clip ? 'bg-green-500' : 'bg-indigo-600'}`} 
          />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                ${status.clip ? 'bg-green-900/50 text-green-400' : 'bg-indigo-900/50 text-indigo-400'}`}>
                📹
              </div>
              <div>
                <h2 className="text-xl font-bold group-hover:text-indigo-400 transition-colors">Clip of the Day</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Odgadnij teledysk</p>
              </div>
            </div>
            {status.clip ? (
              <span className="text-green-500 font-bold text-sm bg-green-900/30 px-3 py-1 rounded-full">UKOŃCZONE</span>
            ) : (
              <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">→</span>
            )}
          </div>
        </Link>

      </div>

      {/* FOOTER */}
      <footer className="mt-20 pb-32 text-center text-zinc-600 text-xs max-w-xs mx-auto space-y-4">
        <p>&copy; 2025 Omnimusle.</p>
        <div className="flex flex-col gap-2 items-center justify-center opacity-70">
          <p>Powered by:</p>
          <div className="flex gap-4 items-center">
            <span>Deezer API</span>
            <span className="text-zinc-700">|</span>
            <img 
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" 
              alt="TMDB Logo" 
              className="h-3" 
            />
          </div>
          <p className="text-[10px] mt-2 text-zinc-700">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </footer>

    </main>
  );
}