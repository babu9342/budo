import React from 'react';
import { Crown, Bot } from 'lucide-react';

export default function PlayerCard({
  player,
  isCurrentTurn,
  isWinner,
  compact = false
}) {
  if (!player) return null;

  const finishedCount = player.tokens.filter(step => step >= 57).length;

  return (
    <div
      className={`relative rounded-xl transition-all duration-300 select-none ${
        isCurrentTurn
          ? 'bg-slate-800/90 border-2 shadow-lg ring-2 ring-amber-400/50 scale-102 z-20'
          : 'bg-slate-900/60 border border-slate-800/80 opacity-90'
      } ${compact ? 'p-1.5' : 'p-2.5'}`}
      style={{
        borderColor: isCurrentTurn ? player.color.hex : 'rgba(51, 65, 85, 0.5)'
      }}
    >
      <div className="flex items-center gap-2">
        {/* Avatar + Active Ring */}
        <div className="relative">
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
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: player.color.hex }}
              ></span>
              <span
                className="relative inline-flex rounded-full h-3.5 w-3.5"
                style={{ backgroundColor: player.color.hex }}
              ></span>
            </span>
          )}

          {player.isBot && (
            <span className="absolute -bottom-1 -left-1 bg-slate-900 p-0.5 rounded-full border border-slate-700">
              <Bot className="w-2.5 h-2.5 text-cyan-400" />
            </span>
          )}

          {player.finishedRank && (
            <span className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 font-black text-[9px] px-1 py-0.2 rounded-full border border-amber-300 shadow-md">
              #{player.finishedRank}
            </span>
          )}
        </div>

        {/* Player Name and Progress */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs md:text-sm font-bold text-white truncate">
              {player.username}
            </span>
            {isWinner && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
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
                  className={`w-2 h-2 rounded-full ${pillColor}`}
                  title={`Token ${idx + 1}`}
                ></span>
              );
            })}
            <span className="text-[10px] text-slate-400 ml-1 font-mono">
              {finishedCount}/4
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
