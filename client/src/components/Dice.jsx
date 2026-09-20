import React, { useState, useEffect } from 'react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function Dice({ value, isRolling, disabled, onRoll, playerColor = '#3B82F6' }) {
  const [internalRoll, setInternalRoll] = useState(false);
  const [displayValue, setDisplayValue] = useState(value || 6);

  useEffect(() => {
    if (value) {
      setDisplayValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (isRolling) {
      setInternalRoll(true);
      sound.playDiceRoll();
      triggerHaptic('medium');

      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 65);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setInternalRoll(false);
        if (value) setDisplayValue(value);
      }, 500);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      setInternalRoll(false);
    }
  }, [isRolling, value]);

  const handleDiceClick = () => {
    if (disabled || isRolling || internalRoll) return;
    sound.playDiceRoll();
    triggerHaptic('light');
    onRoll();
  };

  const renderDots = (val) => {
    const dotClasses = "w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-full bg-slate-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]";
    switch (val) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></span>
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2 sm:p-2.5">
            <span className={dotClasses}></span>
            <span className={`${dotClasses} self-end`}></span>
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-1.5 sm:p-2">
            <span className={dotClasses}></span>
            <span className={`${dotClasses} self-center`}></span>
            <span className={`${dotClasses} self-end`}></span>
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 p-1.5 sm:p-2 place-items-center w-full h-full">
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-3 gap-1 p-1.5 sm:p-2 place-items-center w-full h-full">
            <span className={dotClasses}></span>
            <span></span>
            <span className={dotClasses}></span>
            <span></span>
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-red-600 shadow-inner"></span>
            <span></span>
            <span className={dotClasses}></span>
            <span></span>
            <span className={dotClasses}></span>
          </div>
        );
      case 6:
      default:
        return (
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 sm:gap-x-3.5 sm:gap-y-1.5 p-1.5 sm:p-2 place-items-center w-full h-full">
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
          </div>
        );
    }
  };

  const isSix = displayValue === 6;

  return (
    <div className="flex flex-col items-center justify-center select-none relative">
      {/* Bonus Roll 6 Badge */}
      {isSix && !disabled && (
        <span className="absolute -top-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-black text-[9px] uppercase tracking-wider shadow-lg animate-bounce z-20 whitespace-nowrap">
          🔥 Roll 6 Bonus!
        </span>
      )}

      <button
        onClick={handleDiceClick}
        disabled={disabled || isRolling || internalRoll}
        aria-label="Roll Dice"
        style={{
          boxShadow: !disabled ? `0 0 25px ${playerColor}99, 0 8px 16px rgba(0,0,0,0.5)` : '0 4px 10px rgba(0,0,0,0.4)'
        }}
        className={`relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl bg-gradient-to-b from-white via-slate-100 to-slate-300 border-2 transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-90 ${
          !disabled
            ? 'border-white ring-4 ring-amber-400/50 hover:scale-105 animate-bounce-subtle'
            : 'border-slate-600 opacity-60 cursor-not-allowed'
        } ${internalRoll ? 'rotate-45 scale-110 shadow-2xl' : ''}`}
      >
        {/* Dice Face Container with 3D inset border */}
        <div className="w-full h-full flex items-center justify-center p-1 rounded-xl bg-gradient-to-br from-white/90 to-slate-200/90 shadow-inner relative">
          {renderDots(displayValue)}
        </div>

        {/* Turn Glow Overlay indicator */}
        {!disabled && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border border-white"></span>
          </span>
        )}
      </button>

      <span className={`text-[11px] font-black mt-1.5 uppercase tracking-wider ${!disabled ? 'text-amber-400 animate-pulse drop-shadow' : 'text-slate-500'}`}>
        {!disabled ? (isSix ? 'BONUS ROLL' : 'TAP TO ROLL') : 'WAITING'}
      </span>
    </div>
  );
}
