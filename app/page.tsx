'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState({
    song: false,
    artist: false,
    album: false,
    lyrics: false,
    film: false,
    clip: false,
  });

  useEffect(() => {
    const checkGameStatus = (key: string) => {
      const savedData = localStorage.getItem(key);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        return parsed.gameStatus === 'won' || parsed.gameStatus === 'lost';
      }
      return false;
    };

    setStatus({
      song: checkGameStatus('musicGameProgress'),
      artist: checkGameStatus('artistGameProgress'),
      album: checkGameStatus('albumGameProgress'),
      lyrics: checkGameStatus('lyricsGameProgress'),
      film: checkGameStatus('filmGameProgress'),
      clip: checkGameStatus('clipGameProgress'),
    });
  }, []);

  // Komponent pomocniczy do Karty
  const GameCard = ({ href, title, subtitle, icon, colorClass, isPlayed }: any) => (
    <Link href={href} className="group relative block">
      <div className={`absolute inset-0 rounded-2xl blur opacity-20 transition-opacity group-hover:opacity-40 
        ${isPlayed ? 'bg-green-500' : colorClass}`} 
      />
      <div className="relative bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-zinc-800/50 
            ${isPlayed ? 'text-green-400' : 'text-zinc-200'}`}>
            {icon}
          </div>
          <div>
            <h2 className={`text-lg font-bold transition-colors ${isPlayed ? 'text-green-400' : 'text-white group-hover:text-white'}`}>
              {title}
            </h2>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mt-0.5">
              {isPlayed ? 'Completed' : subtitle}
            </p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
           ${isPlayed ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-white'}`}>
           {isPlayed ? '✓' : '→'}
        </div>
      </div>
    </Link>
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 font-sans selection:bg-green-500 selection:text-white pb-32">
      
      {/* NAGŁÓWEK Z PRZYWRÓCONYM GRADIENTEM */}
      <header className="max-w-2xl mx-auto pt-8 pb-10 text-center">
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-3 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          MUSIC<span className="text-white">DLE</span>
        </h1>
        <p className="text-zinc-400 font-medium text-lg">Daily music challenges</p>
      </header>

      <div className="max-w-md mx-auto grid gap-3">
        
        <GameCard 
          href="/song" title="Song of the Day" subtitle="Guess the intro" icon="🎵" 
          colorClass="bg-blue-600" isPlayed={status.song} 
        />
        
        <GameCard 
          href="/artist" title="Artist of the Day" subtitle="Guess the face" icon="👨‍🎤" 
          colorClass="bg-purple-600" isPlayed={status.artist} 
        />

        <GameCard 
          href="/album" title="Album of the Day" subtitle="Guess the cover" icon="💿" 
          colorClass="bg-yellow-600" isPlayed={status.album} 
        />

        <GameCard 
          href="/lyrics" title="Lyrics of the Day" subtitle="Guess the lines" icon="📝" 
          colorClass="bg-cyan-600" isPlayed={status.lyrics} 
        />

        <GameCard 
          href="/film" title="Film of the Day" subtitle="Guess the soundtrack" icon="🎬" 
          colorClass="bg-red-600" isPlayed={status.film} 
        />

        <GameCard 
          href="/clip" title="Clip of the Day" subtitle="Guess the video" icon="📹" 
          colorClass="bg-indigo-600" isPlayed={status.clip} 
        />

      </div>

      <footer className="mt-16 text-center text-zinc-600 text-[10px] max-w-xs mx-auto space-y-4">
        <p className="font-bold tracking-widest uppercase">&copy; 2025 Musicdle</p>
        <div className="flex flex-col gap-2 items-center justify-center opacity-60">
          <div className="flex gap-3 items-center grayscale hover:grayscale-0 transition-all">
            <span>Deezer API</span>
            <span className="text-zinc-800">|</span>
            <img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB" className="h-2.5" />
          </div>
          <p>Not endorsed or certified by TMDB or Deezer.</p>
        </div>
      </footer>

    </main>
  );
}