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
      }, 70);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setInternalRoll(false);
        if (value) setDisplayValue(value);
      }, 600);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isRolling, value]);

  const handleDiceClick = () => {
    if (disabled || isRolling || internalRoll) return;
    sound.playDiceRoll();
    triggerHaptic('light');
    onRoll();
  };

  const renderDots = (val) => {
    const dotClasses = "w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-slate-900 shadow-inner";
    switch (val) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className={`${dotClasses} scale-125 bg-red-600`}></span>
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2.5">
            <span className={dotClasses}></span>
            <span className={`${dotClasses} self-end`}></span>
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <span className={dotClasses}></span>
            <span className={`${dotClasses} self-center`}></span>
            <span className={`${dotClasses} self-end`}></span>
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-2.5 p-2 place-items-center w-full h-full">
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
            <span className={dotClasses}></span>
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-3 gap-1 p-2 place-items-center w-full h-full">
            <span className={dotClasses}></span>
            <span></span>
            <span className={dotClasses}></span>
            <span></span>
            <span className={`${dotClasses} bg-red-600`}></span>
            <span></span>
            <span className={dotClasses}></span>
            <span></span>
            <span className={dotClasses}></span>
          </div>
        );
      case 6:
      default:
        return (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-2 place-items-center w-full h-full">
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

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <button
        onClick={handleDiceClick}
        disabled={disabled || isRolling || internalRoll}
        aria-label="Roll Dice"
        style={{
          boxShadow: !disabled ? `0 0 20px ${playerColor}80` : 'none'
        }}
        className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-b from-white via-slate-100 to-slate-200 border-2 transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-95 ${
          !disabled
            ? 'border-white animate-bounce-subtle ring-4 ring-blue-500/40'
            : 'border-slate-600 opacity-60 cursor-not-allowed'
        } ${internalRoll ? 'animate-spin-slow rotate-12 scale-105' : ''}`}
      >
        {/* Dice Face Container */}
        <div className="w-full h-full flex items-center justify-center p-1 relative">
          {renderDots(displayValue)}
        </div>

        {/* Turn Glow Overlay */}
        {!disabled && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        )}
      </button>

      <span className={`text-[11px] font-bold mt-1.5 uppercase tracking-wider ${!disabled ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>
        {!disabled ? 'TAP TO ROLL' : 'WAITING'}
      </span>
    </div>
  );
}
