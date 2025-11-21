'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  // 1. WSZYSTKIE HOOKI MUSZĄ BYĆ NA GÓRZE
  const pathname = usePathname();
  const [completedGames, setCompletedGames] = useState<string[]>([]);

  // Mapa: ścieżka -> klucz w LocalStorage
  const STORAGE_KEYS: Record<string, string> = {
    '/song': 'musicGameProgress',
    '/artist': 'artistGameProgress',
    '/album': 'albumGameProgress',
    '/lyrics': 'lyricsGameProgress',
    '/film': 'filmGameProgress',
    '/clip': 'clipGameProgress',
  };

  useEffect(() => {
    const checkStatus = () => {
      const completed: string[] = [];
      
      Object.entries(STORAGE_KEYS).forEach(([path, key]) => {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.gameStatus === 'won' || parsed.gameStatus === 'lost') {
            completed.push(path);
          }
        }
      });
      setCompletedGames(completed);
    };

    checkStatus();
  }, []);

  // 2. DOPIERO TERAZ MOŻEMY ZROBIĆ "EARLY RETURN"
  // Jeśli jesteśmy na stronie głównej, nie renderuj paska
  if (pathname === '/') return null;

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/song', label: 'Song', icon: '🎵' },
    { href: '/artist', label: 'Artist', icon: '👨‍🎤' },
    { href: '/album', label: 'Album', icon: '💿' },
    { href: '/lyrics', label: 'Lyrics', icon: '📝' },
    { href: '/film', label: 'Film', icon: '🎬' },
    { href: '/clip', label: 'Clip', icon: '📹' },
    { href: '/mashup', label: 'Mashup', icon: '🍸' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 z-50 pb-safe">
      <div className="flex justify-around items-center max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isDone = completedGames.includes(item.href);
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-4 px-1 transition-all duration-200 w-full
                ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}
              `}
            >
              <div className="relative">
                <span className={`text-2xl transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                
                {/* ZNACZNIK UKOŃCZENIA */}
                {isDone && item.href !== '/' && (
                  <div className="absolute -top-1 -right-2 bg-green-500 text-black text-[8px] font-bold w-3 h-3 flex items-center justify-center rounded-full border border-zinc-950">
                    ✓
                  </div>
                )}
              </div>

              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}