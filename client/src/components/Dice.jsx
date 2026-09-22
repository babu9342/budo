import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function Dice({ value, isRolling, disabled, onRoll, playerColor = '#3B82F6' }) {
  const [internalRoll, setInternalRoll] = useState(false);
  const [isLandingPop, setIsLandingPop] = useState(false);
  const [displayValue, setDisplayValue] = useState(value || 6);
  const [hasEntered, setHasEntered] = useState(false);
  const prevDisabledRef = useRef(disabled);

  // Trigger drop bounce when it becomes player's active turn
  useEffect(() => {
    if (prevDisabledRef.current && !disabled) {
      setHasEntered(true);
      const t = setTimeout(() => setHasEntered(false), 700);
      return () => clearTimeout(t);
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    if (value) {
      setDisplayValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (isRolling) {
      setInternalRoll(true);
      setIsLandingPop(false);
      sound.playDiceRoll();
      triggerHaptic('medium');

      // Cycle numbers every 110ms during rolling for ~1.3s
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 110);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setInternalRoll(false);
        if (value) setDisplayValue(value);

        // Landing Pop & Glow Flash
        setIsLandingPop(true);
        setTimeout(() => setIsLandingPop(false), 450);
      }, 1300);

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

  // High-visibility crisp light/white pips with red accents
  const renderDots = (val) => {
    const dotClasses = "w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-full bg-[#F8FAFC] shadow-[0_0_6px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(0,0,0,0.4)]";
    switch (val) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9),inset_0_2px_4px_rgba(0,0,0,0.5)] animate-pulse"></span>
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
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
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
        <span className="absolute -top-3.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-black text-[9px] uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-bounce z-20 whitespace-nowrap">
          🔥 Roll 6 Bonus!
        </span>
      )}

      <button
        onClick={handleDiceClick}
        disabled={disabled || isRolling || internalRoll}
        aria-label="Roll Dice"
        style={{
          boxShadow: isLandingPop
            ? `0 0 35px ${playerColor}, 0 0 15px #FFFFFF`
            : !disabled
            ? `0 0 25px ${playerColor}bb, 0 8px 20px rgba(0,0,0,0.8)`
            : '0 4px 10px rgba(0,0,0,0.6)'
        }}
        className={`relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-[#18181b] border-2 transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-90 ${
          hasEntered ? 'animate-dice-drop' : ''
        } ${
          isLandingPop ? 'animate-dice-pop ring-4 ring-white' : ''
        } ${
          !disabled
            ? 'border-white/80 ring-4 ring-amber-400/60 hover:scale-105'
            : 'border-white/10 opacity-50 cursor-not-allowed'
        } ${internalRoll || isRolling ? 'animate-dice-roll shadow-2xl ring-4 ring-amber-400 scale-105' : ''}`}
      >
        {/* Dice Face Container with Dark Inner Glass Gradient */}
        <div className="w-full h-full flex items-center justify-center p-1 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#27272a] to-[#09090b] shadow-inner relative border border-white/10">
          {renderDots(displayValue)}
        </div>

        {/* Turn Active Ping Indicator */}
        {!disabled && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border border-white"></span>
          </span>
        )}
      </button>

      <span className={`text-[11px] font-black mt-1.5 uppercase tracking-wider ${!disabled ? 'text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-slate-500'}`}>
        {!disabled ? (isSix ? 'BONUS ROLL' : 'TAP TO ROLL') : 'WAITING'}
      </span>
    </div>
  );
}
