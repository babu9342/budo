import React from 'react';
import Token from './Token';
import { getGlobalPosition } from '../game/rules';
import { BOARD_THEMES } from '../game/boardThemes';

export default function LudoBoard({
  gameState,
  onSelectToken,
  validTokens = [],
  themeName = 'classic'
}) {
  if (!gameState) return null;

  const currentTheme = BOARD_THEMES[themeName] || BOARD_THEMES.classic;
  const playerCount = gameState.players.length;
  const config = gameState.config;

  // Map of globalPos -> Array of token objects
  const cellOccupants = {};
  // Home bases: playerIndex -> Array of { tokenId, color, isValid, step, playerIndex }
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
        if (!homeBases[pIdx]) homeBases[pIdx] = [];
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
        className={`w-[min(94vw,540px)] aspect-square ${currentTheme.boardBg} rounded-3xl p-1.5 md:p-2.5 border-2 ${currentTheme.boardBorder} shadow-2xl relative overflow-hidden backdrop-blur-xl transition-colors duration-500`}
        style={{
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.85), inset 0 0 20px rgba(255, 255, 255, 0.04)'
        }}
      >
        {playerCount <= 4 ? (
          <Classic4PlayerBoard
            gameState={gameState}
            cellOccupants={cellOccupants}
            homeBases={homeBases}
            finishOccupants={finishOccupants}
            onSelectToken={onSelectToken}
            theme={currentTheme}
          />
        ) : (
          <RadialMultiPlayerBoard
            gameState={gameState}
            cellOccupants={cellOccupants}
            homeBases={homeBases}
            finishOccupants={finishOccupants}
            onSelectToken={onSelectToken}
            playerCount={playerCount}
            theme={currentTheme}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Standard 15x15 Classical Ludo Board for 2, 3, and 4 Players
 */
function Classic4PlayerBoard({
  gameState,
  cellOccupants,
  homeBases,
  finishOccupants,
  onSelectToken,
  theme
}) {
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

  const homeStretchMap = {
    red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
  };

  const safeTrackIndices = [0, 8, 13, 21, 26, 34, 39, 47];

  // Resolve players mapped strictly to their matching home color yard
  const redPlayer = gameState.players.find(p => p.color?.key === 'red');
  const greenPlayer = gameState.players.find(p => p.color?.key === 'green');
  const yellowPlayer = gameState.players.find(p => p.color?.key === 'yellow');
  const bluePlayer = gameState.players.find(p => p.color?.key === 'blue');

  const redTokens = redPlayer ? (homeBases[redPlayer.playerIndex] || []) : [];
  const greenTokens = greenPlayer ? (homeBases[greenPlayer.playerIndex] || []) : [];
  const yellowTokens = yellowPlayer ? (homeBases[yellowPlayer.playerIndex] || []) : [];
  const blueTokens = bluePlayer ? (homeBases[bluePlayer.playerIndex] || []) : [];

  return (
    <div className={`w-full h-full grid grid-cols-15 grid-rows-15 gap-[1px] ${theme.gridBg} rounded-2xl overflow-hidden p-0.5 border ${theme.gridBorder}`}>
      {/* 1. TOP-LEFT: Red Home Yard (rows 0-5, cols 0-5) */}
      <div className={`col-span-6 row-span-6 ${theme.redYard} rounded-tl-xl p-1.5 md:p-2 flex items-center justify-center border relative transition-all duration-300`}>
        <HomeYard
          colorHex={redPlayer?.color?.hex || '#EF4444'}
          colorName="Red"
          player={redPlayer}
          tokens={redTokens}
          onSelectToken={onSelectToken}
          theme={theme}
        />
      </div>

      {/* 2. TOP-MIDDLE: Top Runway Track (rows 0-5, cols 6-8) */}
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1px] bg-slate-950/60">
        {renderSubGrid(0, 5, 6, 8, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players)}
      </div>

      {/* 3. TOP-RIGHT: Green Home Yard (rows 0-5, cols 9-14) */}
      <div className={`col-span-6 row-span-6 ${theme.greenYard} rounded-tr-xl p-1.5 md:p-2 flex items-center justify-center border relative transition-all duration-300`}>
        <HomeYard
          colorHex={greenPlayer?.color?.hex || '#10B981'}
          colorName="Green"
          player={greenPlayer}
          tokens={greenTokens}
          onSelectToken={onSelectToken}
          theme={theme}
        />
      </div>

      {/* 4. MIDDLE-LEFT: Left Runway Track (rows 6-8, cols 0-5) */}
      <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1px] bg-slate-950/60">
        {renderSubGrid(6, 8, 0, 5, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players)}
      </div>

      {/* 5. CENTER: Finish Victory Triangles (rows 6-8, cols 6-8) */}
      <div className="col-span-3 row-span-3 bg-slate-950 relative flex items-center justify-center border border-amber-400/50 shadow-inner overflow-hidden">
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,0 50,50 0,100" fill={theme.centerWedges.red} opacity="0.9" />
            <polygon points="0,0 50,50 100,0" fill={theme.centerWedges.green} opacity="0.9" />
            <polygon points="100,0 50,50 100,100" fill={theme.centerWedges.yellow} opacity="0.9" />
            <polygon points="0,100 50,50 100,100" fill={theme.centerWedges.blue} opacity="0.9" />
          </svg>
        </div>
        {/* Center Glow Hub */}
        <div className="absolute w-6 h-6 rounded-full bg-slate-950/80 border border-amber-300 flex items-center justify-center shadow-lg z-0"></div>
        {/* Finish Tokens Stack */}
        <div className="z-10 flex flex-wrap items-center justify-center gap-1 p-1 max-w-[85%] max-h-[85%] overflow-hidden">
          {finishOccupants.map((t, idx) => (
            <Token
              key={`fin_${idx}`}
              color={t.color}
              size="sm"
              stackCount={1}
            />
          ))}
          {finishOccupants.length === 0 && (
            <span className="text-amber-300 text-sm md:text-base font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">🏆</span>
          )}
        </div>
      </div>

      {/* 6. MIDDLE-RIGHT: Right Runway Track (rows 6-8, cols 9-14) */}
      <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1px] bg-slate-950/60">
        {renderSubGrid(6, 8, 9, 14, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players)}
      </div>

      {/* 7. BOTTOM-LEFT: Blue Home Yard (rows 9-14, cols 0-5) */}
      <div className={`col-span-6 row-span-6 ${theme.blueYard} rounded-bl-xl p-1.5 md:p-2 flex items-center justify-center border relative transition-all duration-300`}>
        <HomeYard
          colorHex={bluePlayer?.color?.hex || '#3B82F6'}
          colorName="Blue"
          player={bluePlayer}
          tokens={blueTokens}
          onSelectToken={onSelectToken}
          theme={theme}
        />
      </div>

      {/* 8. BOTTOM-MIDDLE: Bottom Runway Track (rows 9-14, cols 6-8) */}
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1px] bg-slate-950/60">
        {renderSubGrid(9, 14, 6, 8, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players)}
      </div>

      {/* 9. BOTTOM-RIGHT: Yellow Home Yard (rows 9-14, cols 9-14) */}
      <div className={`col-span-6 row-span-6 ${theme.yellowYard} rounded-br-xl p-1.5 md:p-2 flex items-center justify-center border relative transition-all duration-300`}>
        <HomeYard
          colorHex={yellowPlayer?.color?.hex || '#F59E0B'}
          colorName="Yellow"
          player={yellowPlayer}
          tokens={yellowTokens}
          onSelectToken={onSelectToken}
          theme={theme}
        />
      </div>
    </div>
  );
}

/**
 * Renders Home Base Yard Box with 4 Token Slots
 */
function HomeYard({ colorHex, colorName, player, tokens, onSelectToken, theme }) {
  if (!player) {
    return (
      <div className="w-full h-full bg-slate-950/70 rounded-xl flex flex-col items-center justify-center border border-white/5 opacity-40">
        <span className="text-[10px] uppercase font-bold text-slate-400">Vacant</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-950/85 rounded-xl p-1.5 md:p-2.5 flex flex-col items-center justify-between border-2 border-white/20 shadow-inner">
      <div className="w-full flex items-center justify-between px-0.5">
        <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white drop-shadow truncate max-w-[70%]">
          {player.username}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full ring-2 ring-white/30 shadow-md"
          style={{ backgroundColor: colorHex }}
        ></span>
      </div>

      {/* 4 Token Bases */}
      <div className="grid grid-cols-2 gap-1.5 md:gap-2.5 p-0.5">
        {[0, 1, 2, 3].map((slotIdx) => {
          const token = tokens.find(t => t.tokenId === slotIdx);
          return (
            <div
              key={slotIdx}
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-slate-900 border-2 border-slate-700/80 flex items-center justify-center shadow-inner relative"
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
 * Sub-Grid Track Cell Builder with Theme support and precise home stretch mapping
 */
function renderSubGrid(
  rStart, rEnd, cStart, cEnd,
  trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, players
) {
  const cells = [];
  for (let r = rStart; r <= rEnd; r++) {
    for (let c = cStart; c <= cEnd; c++) {
      const trackIdx = trackCoordMap.findIndex(coord => coord[0] === r && coord[1] === c);
      let isHomeStretch = false;
      let homeStretchColorKey = null;
      let homeStretchIdx = null;

      // Check home stretch for each color
      for (const [colorKey, stretchArr] of Object.entries(homeStretchMap)) {
        const sIdx = stretchArr.findIndex(coord => coord[0] === r && coord[1] === c);
        if (sIdx >= 0) {
          isHomeStretch = true;
          homeStretchColorKey = colorKey;
          homeStretchIdx = sIdx;
          break;
        }
      }

      // Map colorKey to player index for home stretch occupants
      let cellKey;
      if (isHomeStretch) {
        const matchingPlayer = players.find(p => p.color?.key === homeStretchColorKey);
        const pIdx = matchingPlayer ? matchingPlayer.playerIndex : -99;
        cellKey = `HOME_STRETCH_${pIdx}_${homeStretchIdx}`;
      } else {
        cellKey = `track_${trackIdx}`;
      }

      const isSafe = trackIdx >= 0 && safeTrackIndices.includes(trackIdx);
      const occupants = cellOccupants[cellKey] || [];

      let bgClass = theme.cellBg;
      let markerText = null;

      if (isHomeStretch) {
        if (homeStretchColorKey === 'red') bgClass = theme.redStretch;
        else if (homeStretchColorKey === 'green') bgClass = theme.greenStretch;
        else if (homeStretchColorKey === 'yellow') bgClass = theme.yellowStretch;
        else if (homeStretchColorKey === 'blue') bgClass = theme.blueStretch;
      } else if (trackIdx === 0) {
        bgClass = theme.redStart;
        markerText = '▶';
      } else if (trackIdx === 13) {
        bgClass = theme.greenStart;
        markerText = '▼';
      } else if (trackIdx === 26) {
        bgClass = theme.yellowStart;
        markerText = '◀';
      } else if (trackIdx === 39) {
        bgClass = theme.blueStart;
        markerText = '▲';
      }

      cells.push(
        <div
          key={`${r}_${c}`}
          className={`relative border flex items-center justify-center transition-colors ${bgClass}`}
        >
          {/* Safe Star Indicator */}
          {isSafe && occupants.length === 0 && (
            <span className={`text-[10px] md:text-xs font-black select-none ${theme.starColor}`}>★</span>
          )}

          {/* Starting Arrow Indicator (if safe star not present) */}
          {!isSafe && markerText && occupants.length === 0 && (
            <span className="text-[9px] font-bold text-white/50 select-none">{markerText}</span>
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
  playerCount,
  theme
}) {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-2">
      {/* Central Finish Hub */}
      <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-slate-950 border-4 border-amber-400/90 shadow-2xl flex flex-col items-center justify-center z-20 p-1">
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
        const radius = 37;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);

        return (
          <div
            key={pIdx}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div 
              className="p-1.5 md:p-2 rounded-2xl bg-slate-950/90 border-2 shadow-xl flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20"
              style={{ borderColor: player.color.hex }}
            >
              <span className="text-[9px] font-black text-white truncate max-w-[50px]">
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
