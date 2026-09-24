import React from 'react';

/**
 * StickerOverlay renders floating, animated sticker & chat message reactions above the Ludo board.
 * Guarantees single active display with immediate replacement (no overlap/stacking).
 */
export default function StickerOverlay({ stickers = [], playerCount = 4 }) {
  if (!stickers || stickers.length === 0) return null;

  // Always show the latest active reaction (guarantees no stacking/overlap)
  const stk = stickers[stickers.length - 1];
  if (!stk) return null;

  const isLeaving = stk.isLeaving;
  const playerColor = stk.color || '#F59E0B';
  const isImageSticker = Boolean(stk.content && (stk.content.startsWith('/stickers/') || stk.content.includes('.png') || stk.type === 'image'));
  const isPhrase = !isImageSticker && Boolean(stk.content && (stk.content.length > 3 || stk.type === 'text'));

  let customAnimClass = 'animate-sticker-bob';
  if (isImageSticker) {
    if (stk.content.includes('flex_beard')) customAnimClass = 'animate-sticker-flex';
    else if (stk.content.includes('king_crown')) customAnimClass = 'animate-sticker-crown';
    else if (stk.content.includes('hurry_watch')) customAnimClass = 'animate-sticker-hurry';
    else if (stk.content.includes('rofl_shoes')) customAnimClass = 'animate-sticker-rofl';
    else if (stk.content.includes('tea_sip')) customAnimClass = 'animate-sticker-tea';
  }

  const pIdx = stk.playerIndex !== undefined ? stk.playerIndex : -1;

  let posStyle = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  };

  if (pIdx === 0) {
    // Red (Top-Left quadrant)
    posStyle = { top: '30%', left: '30%', transform: 'translate(-50%, -50%)' };
  } else if (pIdx === 1) {
    // Green (Top-Right quadrant)
    posStyle = { top: '30%', left: '70%', transform: 'translate(-50%, -50%)' };
  } else if (pIdx === 2) {
    // Yellow (Bottom-Right quadrant)
    posStyle = { top: '70%', left: '70%', transform: 'translate(-50%, -50%)' };
  } else if (pIdx === 3) {
    // Blue (Bottom-Left quadrant)
    posStyle = { top: '70%', left: '30%', transform: 'translate(-50%, -50%)' };
  }

  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none flex items-center justify-center">
      <div
        key={stk.id}
        className={`absolute z-40 flex flex-col items-center justify-center transition-all duration-300 ${
          isLeaving ? 'animate-sticker-out' : 'animate-sticker-in'
        }`}
        style={posStyle}
      >
        {/* Main Floating Reaction Sticker / Message Bubble */}
        <div className={`${customAnimClass} flex flex-col items-center`}>
          {isImageSticker ? (
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)]">
              <img
                src={stk.content}
                alt="Animated 3D Sticker"
                className="w-full h-full object-contain filter drop-shadow-[0_0_16px_rgba(251,191,36,0.7)] select-none"
              />
            </div>
          ) : isPhrase ? (
            <div
              className="px-4 py-2.5 rounded-2xl bg-slate-950/95 border-2 shadow-2xl text-sm sm:text-base font-black text-white flex items-center gap-2 backdrop-blur-md max-w-[220px] text-center"
              style={{
                borderColor: playerColor,
                boxShadow: `0 0 25px ${playerColor}99, 0 10px 30px rgba(0,0,0,0.95)`
              }}
            >
              <span className="drop-shadow-lg break-words">{stk.content}</span>
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
            className="mt-1.5 px-3 py-0.5 rounded-full bg-slate-950/95 border flex items-center gap-1.5 shadow-xl backdrop-blur-md"
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
            <span className="text-[10px] font-black text-white max-w-[80px] truncate">
              {stk.username || 'Player'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

