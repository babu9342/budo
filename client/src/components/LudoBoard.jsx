import React from 'react';
import Token from './Token';
import { getGlobalPosition } from '../game/rules';

export default function LudoBoard({
  gameState,
  onSelectToken,
  validTokens = []
}) {
  if (!gameState) return null;

  const playerCount = gameState.players.length;
  const config = gameState.config;

  // Identify token positions and stacking
  // Map of globalPos -> Array of { playerIndex, tokenId, color, isCurrentTurn }
  const cellOccupants = {};
  // Home bases: playerIndex -> Array of { tokenId, color }
  const homeBases = Array.from({ length: playerCount }, () => []);
  // Finish base: Array of { playerIndex, tokenId, color }
  const finishOccupants = [];

  gameState.players.forEach((player, pIdx) => {
    player.tokens.forEach((step, tokId) => {
      const isCurrentPlayerTurn = gameState.currentTurnIndex === pIdx;
      const isValid = isCurrentPlayerTurn && validTokens.includes(tokId);

      const tokenObj = {
        playerIndex: pIdx,
        tokenId: tokId,
        color: player.color,
        isValid,
        step
      };

      if (step === -1) {
        homeBases[pIdx].push(tokenObj);
      } else if (step >= config.totalStepsToFinish) {
        finishOccupants.push(tokenObj);
      } else {
        const globalPos = getGlobalPosition(pIdx, step, config);
        const key = typeof globalPos === 'number' ? `track_${globalPos}` : globalPos;
        if (!cellOccupants[key]) cellOccupants[key] = [];
        cellOccupants[key].push(tokenObj);
      }
    });
  });

  return (
    <div className="w-full flex items-center justify-center p-1 sm:p-2 select-none">
      <div 
        className="w-[min(94vw,540px)] aspect-square bg-slate-900/90 rounded-2xl p-1.5 md:p-2 border-2 border-slate-700 shadow-2xl relative overflow-hidden backdrop-blur-md"
        style={{
          boxShadow: '0 0 35px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.05)'
        }}
      >
        {playerCount <= 4 ? (
          <Classic4PlayerBoard
            gameState={gameState}
            cellOccupants={cellOccupants}
            homeBases={homeBases}
            finishOccupants={finishOccupants}
            onSelectToken={onSelectToken}
          />
        ) : (
          <RadialMultiPlayerBoard
            gameState={gameState}
            cellOccupants={cellOccupants}
            homeBases={homeBases}
            finishOccupants={finishOccupants}
            onSelectToken={onSelectToken}
            playerCount={playerCount}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Standard 15x15 Classical Ludo Board for 2 and 4 Players
 */
function Classic4PlayerBoard({
  gameState,
  cellOccupants,
  homeBases,
  finishOccupants,
  onSelectToken
}) {
  // Grid 15x15 cell coordinates to standard Ludo Track indexing
  // Standard 52 Track cells mapped to 15x15 grid coordinates [row, col] (0-indexed)
  const trackCoordMap = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], // 0-4 (Red start at 0 is [6,1])
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], // 5-10
    [0, 7], // 11
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // 12-17 (Green start at 13 is [1,8])
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18-23
    [7, 14], // 24
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 25-30 (Yellow start at 26 is [8,13])
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31-36
    [14, 7], // 37
    [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 38-43 (Blue start at 39 is [13,6])
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 44-49
    [7, 0], // 50
    [6, 0] // 51
  ];

  // Home stretch runways (5 steps each)
  const homeStretchMap = {
    0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], // Red
    1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], // Green
    2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // Yellow
    3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]  // Blue
  };

  const safeTrackIndices = [0, 8, 13, 21, 26, 34, 39, 47];

  return (
    <div className="w-full h-full grid grid-cols-15 grid-rows-15 gap-[1px] bg-slate-800 rounded-xl overflow-hidden p-0.5 border border-slate-700">
      {/* 1. TOP-LEFT: Red Home Yard (rows 0-5, cols 0-5) */}
      <div className="col-span-6 row-span-6 bg-red-600/90 rounded-tl-lg p-2 flex items-center justify-center border border-red-500/40 relative">
        <HomeYard
          colorHex="#EF4444"
          colorName="Red"
          player={gameState.players[0]}
          tokens={homeBases[0] || []}
          onSelectToken={onSelectToken}
        />
      </div>

      {/* 2. TOP-MIDDLE: Top Runway Track (rows 0-5, cols 6-8) */}
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1px] bg-slate-900">
        {renderSubGrid(0, 5, 6, 8, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken)}
      </div>

      {/* 3. TOP-RIGHT: Green Home Yard (rows 0-5, cols 9-14) */}
      <div className="col-span-6 row-span-6 bg-emerald-600/90 rounded-tr-lg p-2 flex items-center justify-center border border-emerald-500/40 relative">
        <HomeYard
          colorHex="#10B981"
          colorName="Green"
          player={gameState.players[1]}
          tokens={homeBases[1] || []}
          onSelectToken={onSelectToken}
        />
      </div>

      {/* 4. MIDDLE-LEFT: Left Runway Track (rows 6-8, cols 0-5) */}
      <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1px] bg-slate-900">
        {renderSubGrid(6, 8, 0, 5, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken)}
      </div>

      {/* 5. CENTER: Finish Victory Triangle (rows 6-8, cols 6-8) */}
      <div className="col-span-3 row-span-3 bg-slate-950 relative flex items-center justify-center border border-amber-400/40 shadow-inner">
        {/* Triangular colored finish wedges */}
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <polygon points="0,0 50,50 0,100" fill="#EF4444" opacity="0.85" />
            <polygon points="0,0 50,50 100,0" fill="#10B981" opacity="0.85" />
            <polygon points="100,0 50,50 100,100" fill="#F59E0B" opacity="0.85" />
            <polygon points="0,100 50,50 100,100" fill="#3B82F6" opacity="0.85" />
          </svg>
        </div>
        {/* Finish Tokens Stack */}
        <div className="z-10 flex flex-wrap items-center justify-center gap-1 p-1">
          {finishOccupants.map((t, idx) => (
            <Token
              key={`fin_${idx}`}
              color={t.color}
              size="sm"
              stackCount={1}
            />
          ))}
          {finishOccupants.length === 0 && (
            <span className="text-amber-300 text-xs font-black drop-shadow">🏆</span>
          )}
        </div>
      </div>

      {/* 6. MIDDLE-RIGHT: Right Runway Track (rows 6-8, cols 9-14) */}
      <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1px] bg-slate-900">
        {renderSubGrid(6, 8, 9, 14, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken)}
      </div>

      {/* 7. BOTTOM-LEFT: Blue Home Yard (rows 9-14, cols 0-5) */}
      <div className="col-span-6 row-span-6 bg-blue-600/90 rounded-bl-lg p-2 flex items-center justify-center border border-blue-500/40 relative">
        <HomeYard
          colorHex="#3B82F6"
          colorName="Blue"
          player={gameState.players[3] || gameState.players[1]}
          tokens={homeBases[3] || []}
          onSelectToken={onSelectToken}
        />
      </div>

      {/* 8. BOTTOM-MIDDLE: Bottom Runway Track (rows 9-14, cols 6-8) */}
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1px] bg-slate-900">
        {renderSubGrid(9, 14, 6, 8, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken)}
      </div>

      {/* 9. BOTTOM-RIGHT: Yellow Home Yard (rows 9-14, cols 9-14) */}
      <div className="col-span-6 row-span-6 bg-amber-500/90 rounded-br-lg p-2 flex items-center justify-center border border-amber-400/40 relative">
        <HomeYard
          colorHex="#F59E0B"
          colorName="Yellow"
          player={gameState.players[2] || gameState.players[1]}
          tokens={homeBases[2] || []}
          onSelectToken={onSelectToken}
        />
      </div>
    </div>
  );
}

/**
 * Renders Home Base Yard Box with 4 Token Slots
 */
function HomeYard({ colorHex, colorName, player, tokens, onSelectToken }) {
  if (!player) {
    return <div className="text-white/30 text-xs font-semibold">Vacant</div>;
  }

  return (
    <div className="w-full h-full bg-slate-900/80 rounded-xl p-2 md:p-3 flex flex-col items-center justify-between border-2 border-white/20 shadow-inner">
      <div className="w-full flex items-center justify-between">
        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white drop-shadow">
          {player.username?.substring(0, 8)}
        </span>
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorHex }}></span>
      </div>

      {/* 4 Token Bases */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 p-1">
        {[0, 1, 2, 3].map((slotIdx) => {
          const token = tokens.find(t => t.tokenId === slotIdx);
          return (
            <div
              key={slotIdx}
              className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shadow-inner relative"
            >
              {token && (
                <Token
                  color={token.color}
                  isValidMove={token.isValid}
                  onClick={() => onSelectToken(token.tokenId)}
                  size="md"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Sub-Grid Track Cell Builder
 */
function renderSubGrid(
  rStart, rEnd, cStart, cEnd,
  trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken
) {
  const cells = [];
  for (let r = rStart; r <= rEnd; r++) {
    for (let c = cStart; c <= cEnd; c++) {
      // 1. Check if track cell
      const trackIdx = trackCoordMap.findIndex(coord => coord[0] === r && coord[1] === c);
      let isHomeStretch = false;
      let homeStretchColor = null;
      let homeStretchIdx = null;

      // Check home stretch
      for (const [pIdx, stretchArr] of Object.entries(homeStretchMap)) {
        const sIdx = stretchArr.findIndex(coord => coord[0] === r && coord[1] === c);
        if (sIdx >= 0) {
          isHomeStretch = true;
          homeStretchColor = pIdx;
          homeStretchIdx = sIdx;
          break;
        }
      }

      const isSafe = trackIdx >= 0 && safeTrackIndices.includes(trackIdx);
      const cellKey = isHomeStretch ? `HOME_STRETCH_${homeStretchColor}_${homeStretchIdx}` : `track_${trackIdx}`;
      const occupants = cellOccupants[cellKey] || [];

      let bgClass = 'bg-slate-900 border-slate-800';
      if (isHomeStretch) {
        if (homeStretchColor === '0') bgClass = 'bg-red-600/60 border-red-500/40';
        if (homeStretchColor === '1') bgClass = 'bg-emerald-600/60 border-emerald-500/40';
        if (homeStretchColor === '2') bgClass = 'bg-amber-500/60 border-amber-400/40';
        if (homeStretchColor === '3') bgClass = 'bg-blue-600/60 border-blue-500/40';
      } else if (trackIdx === 0) {
        bgClass = 'bg-red-500/30 border-red-500/60';
      } else if (trackIdx === 13) {
        bgClass = 'bg-emerald-500/30 border-emerald-500/60';
      } else if (trackIdx === 26) {
        bgClass = 'bg-amber-500/30 border-amber-500/60';
      } else if (trackIdx === 39) {
        bgClass = 'bg-blue-500/30 border-blue-500/60';
      }

      cells.push(
        <div
          key={`${r}_${c}`}
          className={`relative border flex items-center justify-center transition-colors ${bgClass}`}
        >
          {/* Safe Star Indicator */}
          {isSafe && occupants.length === 0 && (
            <span className="text-[9px] text-amber-400 font-bold opacity-80 select-none">★</span>
          )}

          {/* Occupant Tokens */}
          {occupants.length > 0 && (
            <div className="flex items-center justify-center">
              {occupants.map((occ, idx) => (
                <div key={idx} className={idx > 0 ? '-ml-3 z-20' : 'z-10'}>
                  <Token
                    color={occ.color}
                    isValidMove={occ.isValid}
                    onClick={() => onSelectToken(occ.tokenId)}
                    stackCount={occupants.length}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
  }
  return cells;
}

/**
 * 6-Player and 8-Player Radial Geometric Board Layout
 */
function RadialMultiPlayerBoard({
  gameState,
  cellOccupants,
  homeBases,
  finishOccupants,
  onSelectToken,
  playerCount
}) {
  const config = gameState.config;

  return (
    <div className="w-full h-full relative flex items-center justify-center p-2">
      {/* Central Finish Hub */}
      <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-slate-950 border-4 border-amber-400/80 shadow-2xl flex flex-col items-center justify-center z-20 p-1">
        <span className="text-amber-400 text-xs font-black uppercase tracking-wider">BUDO</span>
        <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
          {finishOccupants.map((t, idx) => (
            <Token key={`rad_fin_${idx}`} color={t.color} size="sm" />
          ))}
          {finishOccupants.length === 0 && (
            <span className="text-amber-300 text-sm">🏆</span>
          )}
        </div>
      </div>

      {/* Radial Players Yards & Track Spokes */}
      {gameState.players.map((player, pIdx) => {
        const angle = (pIdx * (360 / playerCount)) * (Math.PI / 180);
        const radius = 38; // percentage from center
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);

        return (
          <div
            key={pIdx}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div 
              className="p-1.5 md:p-2 rounded-xl bg-slate-900/90 border-2 shadow-lg flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20"
              style={{ borderColor: player.color.hex }}
            >
              <span className="text-[9px] font-bold text-white truncate max-w-[50px]">
                {player.username}
              </span>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {(homeBases[pIdx] || []).map((tok, tIdx) => (
                  <Token
                    key={tIdx}
                    color={tok.color}
                    isValidMove={tok.isValid}
                    onClick={() => onSelectToken(tok.tokenId)}
                    size="sm"
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
