import React from 'react';
import { Crown, Bot } from 'lucide-react';

export default function PlayerCard({
  player,
  isCurrentTurn,
  isWinner,
  compact = false,
  remainingSeconds = 60,
  moveTimer = null
}) {
  if (!player) return null;

  const finishedCount = player.tokens.filter(step => step >= 57).length;
  const isUrgent = isCurrentTurn && remainingSeconds <= 10;
  const isMoveTimerActive = isCurrentTurn && moveTimer?.active;
  const moveSeconds = moveTimer ? moveTimer.seconds : 6;
  const moveTotal = moveTimer ? moveTimer.total || 6 : 6;
  const strokeDashoffset = moveTimer ? 113 * (1 - moveSeconds / moveTotal) : 0;

  return (
    <div
      className={`relative rounded-2xl transition-all duration-300 select-none overflow-hidden ${
        isCurrentTurn
          ? `border-2 shadow-xl ring-2 ${isUrgent ? 'ring-red-500/80 animate-pulse' : 'ring-amber-400/50'} scale-102 z-20`
          : 'bg-slate-900/70 border border-slate-800 opacity-90'
      } ${compact ? 'p-1.5 md:p-2' : 'p-2.5'}`}
      style={{
        borderColor: isCurrentTurn ? (isUrgent ? '#EF4444' : player.color.hex) : 'rgba(51, 65, 85, 0.6)',
        background: isCurrentTurn
          ? `linear-gradient(135deg, ${player.color.hex}2e, rgba(15, 23, 42, 0.98))`
          : undefined,
        boxShadow: isCurrentTurn ? `0 0 16px ${player.color.hex}44` : undefined
      }}
    >
      <div className="flex items-center gap-2">
        {/* Avatar + Move Countdown Circular Progress Ring */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          {isMoveTimerActive && (
            <svg
              className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] -rotate-90 pointer-events-none z-30"
              viewBox="0 0 44 44"
            >
              {/* Background Ring */}
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="3"
              />
              {/* Dynamic Shrinking Progress Ring */}
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke={player.color.hex}
                strokeWidth="3.5"
                strokeDasharray="113"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-200"
                style={{ filter: `drop-shadow(0 0 4px ${player.color.hex})` }}
              />
            </svg>
          )}

          <img
            src={player.avatarUrl || '/avatars/default.png'}
            alt={player.username}
            className={`rounded-full object-cover bg-slate-800 border-2 ${
              compact ? 'w-8 h-8' : 'w-10 h-10'
            }`}
            style={{ borderColor: player.color.hex }}
          />

          {isCurrentTurn && !isMoveTimerActive && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUrgent ? 'bg-red-500' : ''}`}
                style={{ backgroundColor: !isUrgent ? player.color.hex : undefined }}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 border border-white ${isUrgent ? 'bg-red-500' : ''}`}
                style={{ backgroundColor: !isUrgent ? player.color.hex : undefined }}
              ></span>
            </span>
          )}

          {player.isBot && (
            <span className="absolute -bottom-1 -left-1 bg-slate-900 p-0.5 rounded-full border border-slate-700 z-10">
              <Bot className="w-2.5 h-2.5 text-cyan-400" />
            </span>
          )}

          {player.finishedRank && (
            <span className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full border border-amber-300 shadow-md z-10">
              #{player.finishedRank}
            </span>
          )}
        </div>

        {/* Player Name and Progress with Animated Turn Arrow / Dot */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              {isCurrentTurn && (
                <span
                  className="text-amber-400 font-black animate-turn-arrow text-[11px] leading-none select-none flex-shrink-0"
                  title="Current Turn"
                >
                  ▶
                </span>
              )}
              <span className="text-xs font-black text-white truncate max-w-[65px] md:max-w-[85px]">
                {player.username}
              </span>
            </div>
            {isWinner ? (
              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
            ) : isMoveTimerActive ? (
              <span
                className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full text-white animate-pulse shadow-sm flex items-center gap-0.5"
                style={{ backgroundColor: player.color.hex }}
              >
                ⏱️ {moveSeconds}s
              </span>
            ) : isCurrentTurn ? (
              <span className={`text-[10px] font-mono font-black px-1 rounded ${isUrgent ? 'text-red-400 bg-red-950/80 animate-ping' : 'text-amber-300 bg-amber-950/60'}`}>
                {remainingSeconds}s
              </span>
            ) : null}
          </div>

          {/* Tokens Progress Pills */}
          <div className="flex items-center gap-1 mt-1">
            {player.tokens.map((step, idx) => {
              let pillColor = 'bg-slate-700'; // Home
              if (step >= 57) pillColor = 'bg-amber-400 shadow-sm shadow-amber-400/50'; // Finished
              else if (step >= 0) pillColor = 'bg-blue-500'; // Active on track

              return (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${pillColor}`}
                  title={`Token ${idx + 1}`}
                ></span>
              );
            })}
            <span className="text-[9px] md:text-[10px] text-slate-400 ml-1 font-mono font-semibold">
              {finishedCount}/4
            </span>
          </div>
        </div>
      </div>

      {/* 60s Live Progress Bar */}
      {isCurrentTurn && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900/80">
          <div
            className={`h-full transition-all duration-300 ${isUrgent ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
            style={{ width: `${Math.max(0, Math.min(100, (remainingSeconds / 60) * 100))}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}
