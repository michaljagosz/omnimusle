'use client';

import { ReactNode } from 'react';

interface GameWrapperProps {
  title: string;
  icon?: string;
  gradientFrom: string; // np. "from-green-400"
  gradientTo: string;   // np. "to-blue-500"
  borderColor: string;  // dynamiczny kolor ramki (np. czerwony przy błędzie)
  shake?: boolean;      // czy trząść ramką?
  children: ReactNode;
}

export default function GameWrapper({ 
  title, icon, gradientFrom, gradientTo, borderColor, shake, children 
}: GameWrapperProps) {
  return (
    <div className={`max-w-md w-full bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border transition-colors duration-200 relative 
      ${borderColor} 
      ${shake ? 'animate-shake' : ''}
    `}>
      {/* NAGŁÓWEK */}
      <div className="p-5 text-center border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <h1 className={`text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${gradientFrom} ${gradientTo} tracking-widest uppercase flex items-center justify-center gap-2`}>
          {icon && <span>{icon}</span>} {title}
        </h1>
      </div>

      {/* TREŚĆ GRY */}
      <div className="p-6 flex flex-col items-center gap-6">
        {children}
      </div>
    </div>
  );
}