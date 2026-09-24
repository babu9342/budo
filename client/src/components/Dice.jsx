import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function Dice({
  value,
  isRolling,
  disabled,
  onRoll,
  playerColor = '#3B82F6',
  timerSeconds = null,
  isUrgent = false,
  inCenter = false
}) {
  const [internalRoll, setInternalRoll] = useState(false);
  const [isLandingPop, setIsLandingPop] = useState(false);
  const [displayValue, setDisplayValue] = useState(value || 1);
  const [hasEntered, setHasEntered] = useState(false);
  const [isSixJump, setIsSixJump] = useState(false);
  const [showCoinEntry, setShowCoinEntry] = useState(false);
  const prevDisabledRef = useRef(disabled);
  const sixJumpTimeoutRef = useRef(null);
  const coinEntryTimeoutRef = useRef(null);

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
      setShowCoinEntry(false);
      setIsSixJump(false);
      sound.playDiceRoll();
      triggerHaptic('medium');

      // Cycle numbers smoothly every 140ms during rolling for ~1.5s
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 140);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setInternalRoll(false);
        if (value) setDisplayValue(value);

        // Landing Pop & Glow Flash
        setIsLandingPop(true);
        setTimeout(() => setIsLandingPop(false), 500);

        // Six: trigger fast upward jump + show coin entry indicator
        if (value === 6) {
          if (sixJumpTimeoutRef.current) clearTimeout(sixJumpTimeoutRef.current);
          if (coinEntryTimeoutRef.current) clearTimeout(coinEntryTimeoutRef.current);

          setIsSixJump(true);
          setShowCoinEntry(true);
          triggerHaptic('heavy');

          sixJumpTimeoutRef.current = setTimeout(() => setIsSixJump(false), 800);
          coinEntryTimeoutRef.current = setTimeout(() => setShowCoinEntry(false), 2200);
        }
      }, 1500);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      setInternalRoll(false);
    }
  }, [isRolling, value]);

  const handleDiceClick = (e) => {
    e?.stopPropagation?.();
    if (disabled || isRolling || internalRoll) return;
    sound.playDiceRoll();
    triggerHaptic('light');
    onRoll();
  };

  // Dynamic crisp pips styled for both center board and standalone views
  const renderDots = (val) => {
    const dotClasses = inCenter
      ? "w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 rounded-full bg-[#F8FAFC] shadow-[0_0_6px_rgba(255,255,255,0.9),inset_0_1px_2px_rgba(0,0,0,0.6)]"
      : "w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F8FAFC] shadow-[0_0_8px_rgba(255,255,255,0.9),inset_0_2px_3px_rgba(0,0,0,0.5)]";

    switch (val) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span
              className={`${
                inCenter ? 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7' : 'w-7 h-7 sm:w-8 sm:h-8'
              } rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,1),inset_0_2px_4px_rgba(0,0,0,0.5)] animate-pulse`}
            />
          </div>
        );
      case 2:
        return (
          <div className={`flex justify-between w-full h-full ${inCenter ? 'p-1.5 sm:p-2' : 'p-3 sm:p-3.5'}`}>
            <span className={dotClasses} />
            <span className={`${dotClasses} self-end`} />
          </div>
        );
      case 3:
        return (
          <div className={`flex justify-between w-full h-full ${inCenter ? 'p-1.5 sm:p-2' : 'p-2.5 sm:p-3'}`}>
            <span className={dotClasses} />
            <span className={`${dotClasses} self-center`} />
            <span className={`${dotClasses} self-end`} />
          </div>
        );
      case 4:
        return (
          <div className={`grid grid-cols-2 ${inCenter ? 'gap-1.5 sm:gap-2 p-1.5 sm:p-2' : 'gap-3 sm:gap-3.5 p-2.5 sm:p-3'} place-items-center w-full h-full`}>
            <span className={dotClasses} />
            <span className={dotClasses} />
            <span className={dotClasses} />
            <span className={dotClasses} />
          </div>
        );
      case 5:
        return (
          <div className={`grid grid-cols-3 ${inCenter ? 'gap-1 p-1 sm:p-1.5' : 'gap-1.5 p-2 sm:p-2.5'} place-items-center w-full h-full`}>
            <span className={dotClasses} />
            <span />
            <span className={dotClasses} />
            <span />
            <span className={`${inCenter ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-5 h-5 sm:w-6 sm:h-6'} rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]`} />
            <span />
            <span className={dotClasses} />
            <span />
            <span className={dotClasses} />
          </div>
        );
      case 6:
      default:
        return (
          <div className={`grid grid-cols-2 ${inCenter ? 'gap-x-2 gap-y-1 sm:gap-x-2.5 sm:gap-y-1.5 p-1 sm:p-2' : 'gap-x-3.5 gap-y-2 sm:gap-x-4 sm:gap-y-2.5 p-2.5 sm:p-3'} place-items-center w-full h-full`}>
            <span className={dotClasses} />
            <span className={dotClasses} />
            <span className={dotClasses} />
            <span className={dotClasses} />
            <span className={dotClasses} />
            <span className={dotClasses} />
          </div>
        );
    }
  };

  const isSix = value === 6 && !internalRoll && !isRolling;
  const showTimer = timerSeconds !== null && !disabled && !internalRoll && !isRolling;

  return (
    <div className="flex flex-col items-center justify-center select-none relative z-30 pointer-events-auto">
      <button
        onClick={handleDiceClick}
        disabled={disabled || isRolling || internalRoll}
        aria-label="Roll Dice"
        style={{
          boxShadow: isLandingPop
            ? `0 0 35px ${playerColor}, 0 0 16px #FFFFFF`
            : !disabled
            ? `0 0 24px ${playerColor}cc, 0 4px 16px rgba(0,0,0,0.85)`
            : '0 2px 8px rgba(0,0,0,0.6)'
        }}
        className={`relative ${
          inCenter
            ? 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl'
            : 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl'
        } bg-[#121214] border-2 transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-90 ${
          hasEntered ? 'animate-dice-drop' : ''
        } ${
          isSixJump && !internalRoll && !isRolling ? 'animate-dice-six-jump' : ''
        } ${
          isLandingPop ? 'animate-dice-pop ring-2 sm:ring-4 ring-white' : ''
        } ${
          !disabled
            ? 'border-white ring-2 sm:ring-4 ring-amber-400/80 hover:scale-105 shadow-xl'
            : 'border-slate-700/90 shadow-md'
        } ${internalRoll || isRolling ? 'animate-dice-roll shadow-2xl ring-2 sm:ring-4 ring-amber-400 scale-105' : ''}`}
      >
        {/* Dice Face Container */}
        <div className="w-full h-full flex items-center justify-center p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#1c1c20] via-[#121215] to-[#0a0a0c] shadow-inner relative border border-white/10">
          {renderDots(displayValue)}
        </div>

        {/* Turn Active Ping Indicator */}
        {!disabled && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-amber-500 border border-white" />
          </span>
        )}

        {/* 6 Rolled: Compact badge embedded directly on dice bottom inside container */}
        {isSix && showCoinEntry && (
          <div className="absolute inset-x-1 bottom-1 z-30 pointer-events-none flex items-center justify-center">
            <span className="bg-amber-400 text-slate-950 font-black text-[7px] sm:text-[8px] uppercase px-1 rounded-full shadow-md animate-bounce whitespace-nowrap">
              🪙 6 Bonus!
            </span>
          </div>
        )}

        {/* Countdown timer badge on dice — visible when waiting to roll */}
        {showTimer && !showCoinEntry && (
          <div className="absolute inset-0 flex items-end justify-center pb-0.5 sm:pb-1 pointer-events-none">
            <span className={`text-[8px] sm:text-[9px] font-black font-mono px-1.5 py-0.2 rounded-full ${
              isUrgent ? 'bg-red-500 text-white animate-pulse' : 'bg-black/80 text-amber-300 border border-amber-400/30'
            }`}>
              {timerSeconds}s
            </span>
          </div>
        )}
      </button>

      {/* Label under standalone dice */}
      {!inCenter && (
        <span className={`text-[11px] font-black mt-2 uppercase tracking-wider ${!disabled ? 'text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-slate-500'}`}>
          {internalRoll || isRolling ? 'ROLLING...' : !disabled ? (isSix ? 'BONUS ROLL' : 'TAP TO ROLL') : 'WAITING'}
        </span>
      )}
    </div>
  );
}
