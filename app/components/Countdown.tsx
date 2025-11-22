'use client';

import { useState, useEffect } from 'react';

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Ustawiamy datę na "jutro północ"
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      
      // Zabezpieczenie (gdyby ktoś siedział równo o północy)
      if (diff <= 0) return "00:00:00";

      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Ustawiamy czas od razu
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Placeholder, żeby nie skakało przy ładowaniu
  if (!timeLeft) return <div className="mt-6 h-12" />;

  return (
    <div className="mt-6 text-center animate-fade-in">
      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Next challenge in</p>
      <p className="text-2xl font-mono font-bold text-white tracking-widest tabular-nums">
        {timeLeft}
      </p>
    </div>
  );
}