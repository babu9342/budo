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

      // Cycle numbers every 160ms during rolling for 1.6s total (1.5–2s duration)
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 160);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setInternalRoll(false);
        if (value) setDisplayValue(value);

        // Smooth landing settle bounce
        setIsLandingPop(true);
        setTimeout(() => setIsLandingPop(false), 450);

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
      }, 1600);

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

  // Dynamic 3D engraved pips styled with realistic cavity depth and polished highlights
  const renderDots = (val) => {
    const dotClasses = inCenter
      ? "w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 rounded-full dice-pip-white"
      : "w-4 h-4 sm:w-5 sm:h-5 rounded-full dice-pip-white";

    switch (val) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span
              className={`${
                inCenter ? 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7' : 'w-7 h-7 sm:w-8 sm:h-8'
              } rounded-full dice-pip-red animate-pulse`}
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
            <span className={`${inCenter ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-5 h-5 sm:w-6 sm:h-6'} rounded-full dice-pip-red`} />
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
  const isRollingActive = internalRoll || isRolling;

  return (
    <div className="dice-container flex flex-col items-center justify-center select-none relative z-30 pointer-events-auto">
      {/* Ground Elevation Shadow Floor */}
      <div 
        className={`absolute -bottom-1 w-3/4 rounded-full transition-all duration-300 pointer-events-none ${
          isRollingActive
            ? 'h-3 bg-black/70 blur-md scale-125 translate-y-2'
            : isLandingPop
            ? 'h-2.5 bg-black/85 blur-xs scale-95 translate-y-0'
            : 'h-1.5 bg-black/60 blur-[2px] scale-100'
        }`}
      />

      <button
        onClick={handleDiceClick}
        disabled={disabled || isRollingActive}
        aria-label="Roll Dice"
        className={`dice ${isRollingActive ? 'rolling' : ''} relative ${
          inCenter
            ? 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl'
            : 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl'
        } dice-3d-cube border-2 flex items-center justify-center cursor-pointer active:scale-90 ${
          hasEntered ? 'animate-dice-drop' : ''
        } ${
          isSixJump && !isRollingActive ? 'animate-dice-six-jump' : ''
        } ${
          isLandingPop ? 'animate-dice-pop ring-2 sm:ring-4 ring-white/90' : ''
        } ${
          !disabled
            ? 'ring-2 sm:ring-4 ring-amber-400/80 hover:scale-105'
            : 'opacity-90'
        }`}
      >
        {/* 3D Dice Face Bevel & Surface Inset */}
        <div className="w-full h-full overflow-hidden flex items-center justify-center p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#262833]/90 via-[#181920]/95 to-[#0d0e12] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.85)] relative border border-white/10 transition-transform duration-150">
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
