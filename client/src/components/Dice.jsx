import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

// Exact 3D Cube Rotation Map (Euler angles to bring face N facing straight-on to viewer)
const FACE_ROTATIONS = {
  1: { x: 0, y: 0, z: 0 },       // Front Face: 1 dot
  2: { x: 90, y: 0, z: 0 },      // Bottom Face: 2 dots
  3: { x: 0, y: -90, z: 0 },     // Right Face: 3 dots
  4: { x: 0, y: 90, z: 0 },      // Left Face: 4 dots
  5: { x: -90, y: 0, z: 0 },     // Top Face: 5 dots
  6: { x: 0, y: 180, z: 0 }      // Back Face: 6 dots
};

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
  const [hasEntered, setHasEntered] = useState(false);
  const [isSixJump, setIsSixJump] = useState(false);
  const [showCoinEntry, setShowCoinEntry] = useState(false);

  const prevDisabledRef = useRef(disabled);
  const sixJumpTimeoutRef = useRef(null);
  const coinEntryTimeoutRef = useRef(null);
  const currentRotRef = useRef({ x: 0, y: 0, z: 0 });

  const [cubeTransform, setCubeTransform] = useState(() => {
    const initTarget = FACE_ROTATIONS[value || 1] || FACE_ROTATIONS[1];
    return `rotateX(${initTarget.x}deg) rotateY(${initTarget.y}deg) rotateZ(${initTarget.z}deg)`;
  });

  // Trigger drop bounce when it becomes player's active turn
  useEffect(() => {
    if (prevDisabledRef.current && !disabled) {
      setHasEntered(true);
      const t = setTimeout(() => setHasEntered(false), 700);
      return () => clearTimeout(t);
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

  // Handle value change when not rolling
  useEffect(() => {
    if (value && !isRolling && !internalRoll) {
      const target = FACE_ROTATIONS[value] || FACE_ROTATIONS[1];
      const cur = currentRotRef.current;
      const modX = Math.round(cur.x / 360) * 360 + target.x;
      const modY = Math.round(cur.y / 360) * 360 + target.y;
      const modZ = Math.round(cur.z / 360) * 360 + target.z;
      currentRotRef.current = { x: modX, y: modY, z: modZ };
      setCubeTransform(`rotateX(${modX}deg) rotateY(${modY}deg) rotateZ(${modZ}deg)`);
    }
  }, [value, isRolling, internalRoll]);

  // Multi-axis physical 3D tumble on roll
  useEffect(() => {
    if (isRolling) {
      setInternalRoll(true);
      setIsLandingPop(false);
      setShowCoinEntry(false);
      setIsSixJump(false);

      sound.playDiceRoll();
      triggerHaptic('medium');

      const finalVal = value || 1;
      const target = FACE_ROTATIONS[finalVal] || FACE_ROTATIONS[1];
      const cur = currentRotRef.current;

      // Add 2-3 full revolutions across all 3 axes + slight randomized physics variation
      const extraRevsX = 2 + Math.floor(Math.random() * 2); // 720 or 1080 deg
      const extraRevsY = 3 + Math.floor(Math.random() * 2); // 1080 or 1440 deg
      const extraRevsZ = 1 + Math.floor(Math.random() * 2); // 360 or 720 deg

      const nextBaseX = (Math.floor(cur.x / 360) + extraRevsX) * 360;
      const nextBaseY = (Math.floor(cur.y / 360) + extraRevsY) * 360;
      const nextBaseZ = (Math.floor(cur.z / 360) + extraRevsZ) * 360;

      const finalX = nextBaseX + target.x;
      const finalY = nextBaseY + target.y;
      const finalZ = nextBaseZ + target.z;

      currentRotRef.current = { x: finalX, y: finalY, z: finalZ };
      setCubeTransform(`rotateX(${finalX}deg) rotateY(${finalY}deg) rotateZ(${finalZ}deg)`);

      const timeout = setTimeout(() => {
        setInternalRoll(false);

        // Tactile landing bounce settle
        setIsLandingPop(true);
        setTimeout(() => setIsLandingPop(false), 450);

        // Six: upward victory jump + coin entry badge
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
      ? "w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 rounded-full dice-pip-white flex-shrink-0"
      : "w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full dice-pip-white flex-shrink-0";

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
            <span className={`${inCenter ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-5 h-5 sm:w-6 sm:h-6'} rounded-full dice-pip-red flex-shrink-0`} />
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
    <div className={`dice-container flex flex-col items-center justify-center select-none relative z-20 ${
      disabled || isRollingActive ? 'pointer-events-none' : 'pointer-events-auto'
    }`}>
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
        style={{ transformStyle: 'preserve-3d' }}
        className={`relative ${
          inCenter ? 'dice-cube-incenter' : 'dice-cube-standalone'
        } ${disabled || isRollingActive ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'} active:scale-90 transition-transform ${
          hasEntered ? 'animate-dice-drop' : ''
        } ${
          isSixJump && !isRollingActive ? 'animate-dice-six-jump' : ''
        } ${
          isLandingPop ? 'animate-dice-pop' : ''
        } ${
          !disabled ? 'ring-2 sm:ring-4 ring-amber-400/80 hover:scale-105 rounded-xl sm:rounded-2xl' : ''
        }`}
      >
        {/* Real 3D Cube with 6 Faces */}
        <div
          className="dice-cube w-full h-full"
          style={{ transform: cubeTransform }}
        >
          <div className="dice-face face-front">{renderDots(1)}</div>
          <div className="dice-face face-back">{renderDots(6)}</div>
          <div className="dice-face face-right">{renderDots(3)}</div>
          <div className="dice-face face-left">{renderDots(4)}</div>
          <div className="dice-face face-top">{renderDots(5)}</div>
          <div className="dice-face face-bottom">{renderDots(2)}</div>
        </div>

        {/* Turn Active Ping Indicator */}
        {!disabled && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 pointer-events-none z-40">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-amber-500 border border-white" />
          </span>
        )}

        {/* 6 Rolled: Compact badge embedded directly on dice bottom inside container */}
        {isSix && showCoinEntry && (
          <div className="absolute inset-x-1 -bottom-4 z-40 pointer-events-none flex items-center justify-center">
            <span className="bg-amber-400 text-slate-950 font-black text-[7px] sm:text-[8px] uppercase px-1.5 py-0.5 rounded-full shadow-md animate-bounce whitespace-nowrap">
              🪙 6 Bonus!
            </span>
          </div>
        )}

        {/* Countdown timer badge on dice — visible when waiting to roll */}
        {showTimer && !showCoinEntry && (
          <div className="absolute inset-x-0 -bottom-3 z-40 flex items-center justify-center pointer-events-none">
            <span className={`text-[8px] sm:text-[9px] font-black font-mono px-1.5 py-0.2 rounded-full ${
              isUrgent ? 'bg-red-500 text-white animate-pulse' : 'bg-black/85 text-amber-300 border border-amber-400/40 shadow-sm'
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
