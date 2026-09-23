import React from 'react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function Token({
  color,
  isValidMove,
  isSelected,
  isHopping = false,
  isCaptured = false,
  onClick,
  stackCount = 1,
  size = 'md',
  counterRotation = 0
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (isValidMove && onClick) {
      sound.playMove();
      triggerHaptic('light');
      onClick();
    }
  };

  const colorMap = {
    red: 'from-red-500 to-red-700 border-red-300 ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.6)]',
    green: 'from-emerald-400 to-emerald-600 border-emerald-200 ring-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.6)]',
    yellow: 'from-amber-400 to-amber-600 border-amber-200 ring-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.6)]',
    blue: 'from-blue-400 to-blue-600 border-blue-200 ring-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.6)]',
    orange: 'from-orange-400 to-orange-600 border-orange-200 ring-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.6)]',
    cyan: 'from-cyan-400 to-cyan-600 border-cyan-200 ring-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.6)]',
    purple: 'from-purple-400 to-purple-600 border-purple-200 ring-purple-500/50 shadow-[0_0_12px_rgba(139,92,246,0.6)]',
    lime: 'from-lime-400 to-lime-600 border-lime-200 ring-lime-500/50 shadow-[0_0_12px_rgba(132,204,22,0.6)]'
  };

  const styleClass = colorMap[color?.key] || colorMap.red;

  return (
    <div
      onClick={handleClick}
      className={`relative rounded-full flex items-center justify-center transition-all duration-150 select-none ${
        isCaptured
          ? 'animate-capture-fade z-50'
          : isHopping
          ? 'animate-token-hop z-50 scale-125'
          : isValidMove
          ? 'cursor-pointer hover:scale-125 active:scale-95 z-40'
          : 'z-10'
      }`}
      style={{
        width: size === 'sm' ? '22px' : '28px',
        height: size === 'sm' ? '22px' : '28px'
      }}
    >
      {/* Large Glowing Move Indicator Arrow (2x Size, Bright Yellow/White with Dark Outline & 800ms Pulse) */}
      {isValidMove && !isHopping && !isCaptured && (
        <div
          className="absolute -top-8 sm:-top-9 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-indicator-pulse flex flex-col items-center origin-bottom"
          style={counterRotation ? { transform: `translateX(-50%) rotate(${-counterRotation}deg)` } : undefined}
        >
          <svg
            className="w-7 h-7 sm:w-8 sm:h-8 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.95)] drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)]"
            viewBox="0 0 24 24"
            fill="none"
          >
            {/* Bold Outer Arrow Frame */}
            <path
              d="M12 22L3.5 12H8.5V2H15.5V12H20.5L12 22Z"
              fill="#FDE047"
              stroke="#09090b"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Vivid Inner Core Arrow */}
            <path
              d="M12 19L5.5 12.5H9.5V3.5H14.5V12.5H18.5L12 19Z"
              fill="#F59E0B"
            />
            {/* Top Shine Highlight */}
            <circle cx="12" cy="7" r="1.5" fill="#FFFFFF" opacity="0.9" />
          </svg>
        </div>
      )}

      {/* 3D Outer Token Cap */}
      <div
        className={`w-full h-full rounded-full bg-gradient-to-b ${styleClass} border-2 shadow-md flex items-center justify-center relative ${
          isHopping
            ? 'ring-4 ring-white shadow-2xl drop-shadow-[0_0_14px_rgba(255,255,255,0.95)]'
            : isValidMove
            ? 'ring-4 ring-amber-300 ring-offset-2 ring-offset-black/90 shadow-[0_0_18px_rgba(251,191,36,1)]'
            : ''
        } ${isSelected ? 'ring-4 ring-yellow-400 scale-110' : ''}`}
      >
        {/* Inner Highlight Ring */}
        <div className="w-2.5 h-2.5 rounded-full bg-white/80 shadow-inner flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-slate-900/50"></div>
        </div>

        {/* Stack Multiplier Badge */}
        {stackCount > 1 && !isHopping && !isCaptured && (
          <span
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-950 text-white text-[9px] font-black rounded-full border border-amber-400 flex items-center justify-center shadow-lg"
            style={counterRotation ? { transform: `rotate(${-counterRotation}deg)` } : undefined}
          >
            {stackCount}
          </span>
        )}
      </div>
    </div>
  );
}
