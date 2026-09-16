import React from 'react';

export default function BudoLogo({ size = 'md', subtitle = false }) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-6xl'
  }[size] || 'text-3xl';

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          {/* Glowing Dice Icon */}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-500 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center transform -rotate-6 transition-transform hover:rotate-0">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center relative overflow-hidden">
              <div className="grid grid-cols-2 gap-1 p-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className={`font-black tracking-wider uppercase font-display bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)] ${sizeClasses}`}>
            BUDO
          </h1>
        </div>
      </div>

      {subtitle && (
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold mt-1">
          Play • Compete • Have Fun
        </p>
      )}
    </div>
  );
}
