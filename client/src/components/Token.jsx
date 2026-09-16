import React from 'react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function Token({
  color,
  isValidMove,
  isSelected,
  onClick,
  stackCount = 1,
  size = 'md'
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
    red: 'from-red-500 to-red-700 border-red-300 ring-red-500/50',
    green: 'from-emerald-400 to-emerald-600 border-emerald-200 ring-emerald-500/50',
    yellow: 'from-amber-400 to-amber-600 border-amber-200 ring-amber-500/50',
    blue: 'from-blue-400 to-blue-600 border-blue-200 ring-blue-500/50',
    orange: 'from-orange-400 to-orange-600 border-orange-200 ring-orange-500/50',
    cyan: 'from-cyan-400 to-cyan-600 border-cyan-200 ring-cyan-500/50',
    purple: 'from-purple-400 to-purple-600 border-purple-200 ring-purple-500/50',
    lime: 'from-lime-400 to-lime-600 border-lime-200 ring-lime-500/50'
  };

  const styleClass = colorMap[color?.key] || colorMap.red;

  return (
    <div
      onClick={handleClick}
      className={`relative rounded-full flex items-center justify-center transition-all duration-300 select-none ${
        isValidMove ? 'cursor-pointer hover:scale-115 active:scale-95 animate-pulse-glow z-30' : 'z-10'
      }`}
      style={{
        width: size === 'sm' ? '22px' : '28px',
        height: size === 'sm' ? '22px' : '28px'
      }}
    >
      {/* 3D Outer Token Cap */}
      <div
        className={`w-full h-full rounded-full bg-gradient-to-b ${styleClass} border-2 shadow-md flex items-center justify-center relative ${
          isValidMove ? 'ring-4 ring-offset-1 ring-offset-slate-900 animate-bounce-subtle' : ''
        } ${isSelected ? 'ring-4 ring-yellow-400 scale-110' : ''}`}
      >
        {/* Inner Highlight Ring */}
        <div className="w-2.5 h-2.5 rounded-full bg-white/60 shadow-inner flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-slate-900/40"></div>
        </div>

        {/* Stack Multiplier Badge */}
        {stackCount > 1 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-950 text-white text-[9px] font-black rounded-full border border-amber-400 flex items-center justify-center shadow-lg">
            {stackCount}
          </span>
        )}
      </div>
    </div>
  );
}
