import React from 'react';
import { Crown, Bot } from 'lucide-react';

export default function PlayerCard({
  player,
  isCurrentTurn,
  isWinner,
  compact = false,
  remainingSeconds = 60
}) {
  if (!player) return null;

  const finishedCount = player.tokens.filter(step => step >= 57).length;
  const isUrgent = isCurrentTurn && remainingSeconds <= 10;

  return (
    <div
      className={`relative rounded-2xl transition-all duration-300 select-none overflow-hidden ${
        isCurrentTurn
          ? `bg-slate-800/95 border-2 shadow-xl ring-2 ${isUrgent ? 'ring-red-500/80 animate-pulse' : 'ring-amber-400/50'} scale-102 z-20`
          : 'bg-slate-900/70 border border-slate-800 opacity-90'
      } ${compact ? 'p-1.5 md:p-2' : 'p-2.5'}`}
      style={{
        borderColor: isCurrentTurn ? (isUrgent ? '#EF4444' : player.color.hex) : 'rgba(51, 65, 85, 0.6)'
      }}
    >
      <div className="flex items-center gap-2">
        {/* Avatar + Active Ring */}
        <div className="relative flex-shrink-0">
          <img
            src={player.avatarUrl || '/avatars/default.png'}
            alt={player.username}
            className={`rounded-full object-cover bg-slate-800 border-2 ${
              compact ? 'w-8 h-8' : 'w-10 h-10'
            }`}
            style={{ borderColor: player.color.hex }}
          />

          {isCurrentTurn && (
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
            <span className="absolute -bottom-1 -left-1 bg-slate-900 p-0.5 rounded-full border border-slate-700">
              <Bot className="w-2.5 h-2.5 text-cyan-400" />
            </span>
          )}

          {player.finishedRank && (
            <span className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full border border-amber-300 shadow-md">
              #{player.finishedRank}
            </span>
          )}
        </div>

        {/* Player Name and Progress */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white truncate max-w-[70px] md:max-w-[90px]">
              {player.username}
            </span>
            {isWinner ? (
              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
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
