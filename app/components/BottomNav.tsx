'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  // NOWOŚĆ: Jeśli jesteśmy na stronie głównej, nie renderuj paska
  if (pathname === '/') return null;

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/song', label: 'Song', icon: '🎵' },
    { href: '/artist', label: 'Artist', icon: '👨‍🎤' },
    { href: '/album', label: 'Album', icon: '💿' },
    { href: '/lyrics', label: 'Lyrics', icon: '📝' },
    { href: '/film', label: 'Film', icon: '🎬' },
    { href: '/clip', label: 'Clip', icon: '📹' }, // Dodaj jeśli jeszcze nie masz
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 z-50 pb-safe">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center py-3 px-2 transition-all duration-200
                ${isActive ? 'text-white scale-110' : 'text-zinc-600 hover:text-zinc-400'}
              `}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {/* Opcjonalnie: Ukryj tekst, jeśli ikon jest dużo */}
              {/* <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span> */}
              
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}