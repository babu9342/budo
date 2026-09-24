import React from 'react';

/**
 * StickerOverlay renders floating, animated sticker reactions above the Ludo board.
 * Positioned dynamically near the sending player's board corner or center.
 */
export default function StickerOverlay({ stickers = [], playerCount = 4 }) {
  if (!stickers || stickers.length === 0) return null;

  const getPositionStyle = (sticker, idx) => {
    const pIdx = sticker.playerIndex !== undefined ? sticker.playerIndex : -1;
    // Slight jitter based on index so multiple reactions don't perfectly overlap
    const jitterX = ((idx % 3) - 1) * 20;
    const jitterY = ((idx % 2) - 0.5) * 20;

    if (pIdx === 0) {
      // Top-Left (Red)
      return { top: `calc(18% + ${jitterY}px)`, left: `calc(18% + ${jitterX}px)` };
    } else if (pIdx === 1) {
      // Top-Right (Green)
      return { top: `calc(18% + ${jitterY}px)`, right: `calc(18% + ${jitterX}px)` };
    } else if (pIdx === 2) {
      // Bottom-Right (Yellow)
      return { bottom: `calc(18% + ${jitterY}px)`, right: `calc(18% + ${jitterX}px)` };
    } else if (pIdx === 3) {
      // Bottom-Left (Blue)
      return { bottom: `calc(18% + ${jitterY}px)`, left: `calc(18% + ${jitterX}px)` };
    }

    // Default: Center-staggered
    return {
      top: `calc(50% + ${jitterY}px)`,
      left: `calc(50% + ${jitterX}px)`,
      transform: 'translate(-50%, -50%)'
    };
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none">
      {stickers.map((stk, idx) => {
        const isLeaving = stk.isLeaving;
        const playerColor = stk.color || '#F59E0B';
        const isPhrase = stk.content && stk.content.length > 3;

        return (
          <div
            key={stk.id || idx}
            className={`absolute z-40 flex flex-col items-center justify-center transition-all ${
              isLeaving ? 'animate-sticker-out' : 'animate-sticker-in'
            }`}
            style={getPositionStyle(stk, idx)}
          >
            {/* Main Floating Reaction Sticker */}
            <div className="animate-sticker-bob flex flex-col items-center">
              {isPhrase ? (
                <div
                  className="px-4 py-2.5 rounded-2xl bg-slate-950/95 border-2 shadow-2xl text-sm sm:text-base font-black text-white flex items-center gap-2 backdrop-blur-md"
                  style={{
                    borderColor: playerColor,
                    boxShadow: `0 0 25px ${playerColor}88, 0 10px 30px rgba(0,0,0,0.9)`
                  }}
                >
                  <span className="drop-shadow-lg">{stk.content}</span>
                </div>
              ) : (
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
                  style={{
                    filter: `drop-shadow(0 0 18px ${playerColor}bb) drop-shadow(0 8px 16px rgba(0,0,0,0.9))`
                  }}
                >
                  <span className="text-6xl sm:text-7xl leading-none select-none">
                    {stk.content}
                  </span>
                </div>
              )}

              {/* Sender Pill Badge */}
              <div
                className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-950/90 border flex items-center gap-1.5 shadow-xl backdrop-blur-sm"
                style={{ borderColor: playerColor }}
              >
                {stk.avatarUrl && (
                  <img
                    src={stk.avatarUrl}
                    alt={stk.username}
                    className="w-3.5 h-3.5 rounded-full object-cover border"
                    style={{ borderColor: playerColor }}
                  />
                )}
                <span className="text-[9px] sm:text-[10px] font-black text-white max-w-[70px] truncate">
                  {stk.username || 'Player'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
