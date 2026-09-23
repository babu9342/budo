import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function Dice({ value, isRolling, disabled, onRoll, playerColor = '#3B82F6', timerSeconds = null, isUrgent = false }) {
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

      // Cycle numbers every 80ms during rolling for ~1.5s — slow enough to see each face clearly
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 80);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setInternalRoll(false);
        if (value) setDisplayValue(value);

        // Landing Pop & Glow Flash
        setIsLandingPop(true);
        setTimeout(() => setIsLandingPop(false), 500);
      }, 1500);

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

  // Larger crisp pips — increased for bigger dice
  const renderDots = (val) => {
    const dotClasses = "w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F8FAFC] shadow-[0_0_8px_rgba(255,255,255,0.9),inset_0_2px_3px_rgba(0,0,0,0.5)]";
    switch (val) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500 shadow-[0_0_16px_rgba(239,68,68,1),inset_0_2px_5px_rgba(0,0,0,0.5)] animate-pulse"></span>
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-3 sm:p-3.5">
            <span className={dotClasses}></span>
            <span className={`${dotClasses} self-end`}></span>
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2.5 sm:p-3">
            <span className={dotClasses}></span>
            <span className={`${dotClasses} self-center`}></span>
            <span className={`${dotClasses} self-end`}></span>
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-3 sm:gap-3.5 p-2.5 sm:p-3 place-items-center w-full h-full">
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-3 gap-1.5 p-2 sm:p-2.5 place-items-center w-full h-full">
            <span className={dotClasses}></span>
            <span></span>
            <span className={dotClasses}></span>
            <span></span>
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]"></span>
            <span></span>
            <span className={dotClasses}></span>
            <span></span>
            <span className={dotClasses}></span>
          </div>
        );
      case 6:
      default:
        return (
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-2 sm:gap-x-4 sm:gap-y-2.5 p-2.5 sm:p-3 place-items-center w-full h-full">
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
  const showTimer = timerSeconds !== null && !disabled && !internalRoll && !isRolling;

  return (
    <div className="flex flex-col items-center justify-center select-none relative">
      {/* Bonus Roll 6 Badge */}
      {isSix && !disabled && !internalRoll && (
        <span className="absolute -top-5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-black text-[9px] uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.9)] animate-bounce z-20 whitespace-nowrap">
          🔥 Bonus Roll!
        </span>
      )}

      <button
        onClick={handleDiceClick}
        disabled={disabled || isRolling || internalRoll}
        aria-label="Roll Dice"
        style={{
          boxShadow: isLandingPop
            ? `0 0 40px ${playerColor}, 0 0 18px #FFFFFF`
            : !disabled
            ? `0 0 30px ${playerColor}cc, 0 10px 24px rgba(0,0,0,0.85)`
            : '0 4px 12px rgba(0,0,0,0.6)'
        }}
        className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#18181b] border-2 transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-90 ${
          hasEntered ? 'animate-dice-drop' : ''
        } ${
          isLandingPop ? 'animate-dice-pop ring-4 ring-white' : ''
        } ${
          !disabled
            ? 'border-white/80 ring-4 ring-amber-400/60 hover:scale-105'
            : 'border-white/10 opacity-50 cursor-not-allowed'
        } ${internalRoll || isRolling ? 'animate-dice-roll shadow-2xl ring-4 ring-amber-400 scale-105' : ''}`}
      >
        {/* Dice Face Container */}
        <div className="w-full h-full flex items-center justify-center p-1.5 rounded-xl bg-gradient-to-br from-[#27272a] to-[#09090b] shadow-inner relative border border-white/10">
          {renderDots(displayValue)}
        </div>

        {/* Turn Active Ping Indicator */}
        {!disabled && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 border border-white"></span>
          </span>
        )}

        {/* Countdown timer badge on dice — visible when waiting to roll */}
        {showTimer && (
          <div className="absolute inset-0 flex items-end justify-center pb-1.5 pointer-events-none">
            <span className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-full ${
              isUrgent ? 'bg-red-500 text-white animate-pulse' : 'bg-black/60 text-amber-300'
            }`}>
              {timerSeconds}s
            </span>
          </div>
        )}
      </button>

      <span className={`text-[11px] font-black mt-2 uppercase tracking-wider ${!disabled ? 'text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-slate-500'}`}>
        {internalRoll || isRolling ? 'ROLLING...' : !disabled ? (isSix ? 'BONUS ROLL' : 'TAP TO ROLL') : 'WAITING'}
      </span>
    </div>
  );
}
