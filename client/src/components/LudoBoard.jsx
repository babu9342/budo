import React, { useState, useEffect, useRef } from 'react';
import Token from './Token';
import { getGlobalPosition } from '../game/rules';
import { BOARD_THEMES } from '../game/boardThemes';
import { sound } from '../utils/soundEngine';

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

  const [animatingPositions, setAnimatingPositions] = useState({});
  const [hoppingToken, setHoppingToken] = useState(null);
  const [capturedTokens, setCapturedTokens] = useState({});
  const prevPositionsRef = useRef(null);
  const animIntervalRef = useRef(null);

  // Step-by-step token hopping animation engine
  useEffect(() => {
    if (!gameState || !gameState.players) return;

    const currentMap = {};
    gameState.players.forEach((p, pIdx) => {
      p.tokens.forEach((step, tokId) => {
        currentMap[`${pIdx}_${tokId}`] = step;
      });
    });

    if (!prevPositionsRef.current) {
      prevPositionsRef.current = currentMap;
      setAnimatingPositions(currentMap);
      return;
    }

    const prevMap = prevPositionsRef.current;
    let forwardMove = null;

    // Detect captures (token reset from track >= 0 to -1)
    for (const key in prevMap) {
      const oldStep = prevMap[key];
      const newStep = currentMap[key] !== undefined ? currentMap[key] : -1;
      if (oldStep >= 0 && newStep === -1) {
        sound.playCapture();
        triggerHaptic('heavy');
        setCapturedTokens(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
          setCapturedTokens(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 500);
      }
    }

    // Detect if any token moved forward
    for (const key in currentMap) {
      const oldStep = prevMap[key] !== undefined ? prevMap[key] : -1;
      const newStep = currentMap[key];

      if (newStep !== oldStep) {
        const [pIdx, tokId] = key.split('_').map(Number);
        if (oldStep === -1 && newStep === 0) {
          forwardMove = { key, pIdx, tokId, from: -1, to: 0, type: 'spawn' };
          break;
        } else if (newStep > oldStep && oldStep >= 0) {
          forwardMove = { key, pIdx, tokId, from: oldStep, to: newStep, type: 'step_by_step' };
          break;
        }
      }
    }

    // Update ref
    prevPositionsRef.current = currentMap;

    if (forwardMove) {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);

      if (forwardMove.type === 'spawn') {
        sound.playMove();
        setHoppingToken(forwardMove.key);
        setAnimatingPositions(prev => ({ ...prev, [forwardMove.key]: 0 }));
        const t = setTimeout(() => {
          setHoppingToken(null);
          setAnimatingPositions(currentMap);
        }, 320);
        return () => clearTimeout(t);
      } else if (forwardMove.type === 'step_by_step') {
        let currentStep = forwardMove.from;
        const targetStep = forwardMove.to;
        const key = forwardMove.key;

        setHoppingToken(key);

        // Smooth cell-by-cell 320ms hop with easing
        animIntervalRef.current = setInterval(() => {
          currentStep += 1;
          sound.playMove();
          setHoppingToken(key);
          setAnimatingPositions(prev => ({ ...prev, [key]: currentStep }));

          if (currentStep >= targetStep) {
            clearInterval(animIntervalRef.current);
            animIntervalRef.current = null;
            setTimeout(() => {
              setHoppingToken(null);
              setAnimatingPositions(currentMap);
            }, 180);
          }
        }, 320);

        return () => {
          if (animIntervalRef.current) clearInterval(animIntervalRef.current);
        };
      }
    } else {
      setAnimatingPositions(currentMap);
    }
  }, [gameState]);

  // Map of globalPos -> Array of token objects
  const cellOccupants = {};
  // Home bases: playerIndex -> Array of { tokenId, color, isValid, step, playerIndex, isHopping, isCaptured }
  const homeBases = Array.from({ length: playerCount }, () => []);
  // Finish base: Array of { playerIndex, tokenId, color, isHopping }
  const finishOccupants = [];

  gameState.players.forEach((player, pIdx) => {
    player.tokens.forEach((actualStep, tokId) => {
      const isCurrentPlayerTurn = gameState.currentTurnIndex === pIdx;
      const isValid = isCurrentPlayerTurn && validTokens.includes(tokId);
      const key = `${pIdx}_${tokId}`;

      const displayedStep = animatingPositions[key] !== undefined ? animatingPositions[key] : actualStep;
      const isHopping = hoppingToken === key;
      const isCaptured = Boolean(capturedTokens[key]);

      const tokenObj = {
        playerIndex: pIdx,
        tokenId: tokId,
        color: player.color,
        isValid,
        step: displayedStep,
        isHopping,
        isCaptured
      };

      if (displayedStep === -1) {
        if (!homeBases[pIdx]) homeBases[pIdx] = [];
        homeBases[pIdx].push(tokenObj);
      } else if (displayedStep >= config.totalStepsToFinish) {
        finishOccupants.push(tokenObj);
      } else {
        const globalPos = getGlobalPosition(pIdx, displayedStep, config);
        const cellKey = typeof globalPos === 'number' ? `track_${globalPos}` : globalPos;
        if (!cellOccupants[cellKey]) cellOccupants[cellKey] = [];
        cellOccupants[cellKey].push(tokenObj);
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
      <div className="col-span-3 row-span-3 bg-[#0d0d0d] relative flex items-center justify-center border border-amber-400/50 shadow-2xl overflow-hidden">
        {/* Subtle Radial Glow Focal Point */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.28)_0%,transparent_75%)] pointer-events-none z-0"></div>
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,0 50,50 0,100" fill={theme.centerWedges.red} opacity="0.95" />
            <polygon points="0,0 50,50 100,0" fill={theme.centerWedges.green} opacity="0.95" />
            <polygon points="100,0 50,50 100,100" fill={theme.centerWedges.yellow} opacity="0.95" />
            <polygon points="0,100 50,50 100,100" fill={theme.centerWedges.blue} opacity="0.95" />
          </svg>
        </div>
        {/* Center Glow Hub */}
        <div className="absolute w-6 h-6 rounded-full bg-black/90 border border-amber-300 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.8)] z-0"></div>
        {/* Finish Tokens Stack */}
        <div className="z-10 flex flex-wrap items-center justify-center gap-1 p-1 max-w-[85%] max-h-[85%] overflow-hidden">
          {finishOccupants.map((t, idx) => (
            <Token
              key={`fin_${idx}`}
              color={t.color}
              size="sm"
              isCaptured={t.isCaptured}
              stackCount={1}
            />
          ))}
          {finishOccupants.length === 0 && (
            <span className="text-amber-300 text-sm md:text-base font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">🏆</span>
          )}
        </div>
      </div>

      {/* 6. MIDDLE-RIGHT: Right Runway Track (rows 6-8, cols 9-14) */}
      <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1px] bg-[#2a2a2a]">
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
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1px] bg-[#2a2a2a]">
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
 * Renders Home Base Yard Box with classic inset square, diamond, and 4 Token Slots
 */
function HomeYard({ colorHex, colorName, player, tokens, onSelectToken, theme }) {
  if (!player) {
    return (
      <div className="w-full h-full bg-slate-950/40 rounded-xl flex flex-col items-center justify-center border border-white/10">
        <span className="text-[10px] uppercase font-bold text-slate-400">Vacant</span>
      </div>
    );
  }

  const isFlatMinimal = theme.isFlatMinimal;
  const isFestive = theme.isFestive;
  const isDarkMode = theme.isDarkMode;

  return (
    <div className="w-full h-full rounded-xl p-1.5 md:p-2 flex flex-col items-center justify-between relative overflow-hidden">
      {/* Festive Corner Ornament */}
      {isFestive && (
        <div className="absolute top-1 left-1 text-[12px] opacity-70 select-none">
          🪷
        </div>
      )}

      {/* Header with Username & Status */}
      <div className="w-full flex items-center justify-between px-1 z-10">
        <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white drop-shadow truncate max-w-[75%]">
          {player.username}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full ring-2 ring-white/60 shadow-sm"
          style={{ backgroundColor: colorHex }}
        ></span>
      </div>

      {/* Inset Base Square with Diamond Pips */}
      <div
        className={`w-[82%] aspect-square rounded-xl shadow-lg border flex items-center justify-center relative p-1 transition-all ${
          isDarkMode
            ? 'bg-[#121212] border-white/15 shadow-black/80'
            : 'bg-white border-black/10'
        }`}
      >
        {/* Rotated Diamond Background */}
        <div
          className="w-[74%] aspect-square rounded-lg rotate-45 border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: colorHex,
            backgroundColor: isDarkMode ? `${colorHex}1a` : isFlatMinimal ? `${colorHex}15` : `${colorHex}25`,
            boxShadow: isDarkMode ? `0 0 10px ${colorHex}35` : 'none'
          }}
        ></div>

        {/* 4 Token Bases in 2x2 Dice Pip Grid */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-2.5 gap-2 items-center justify-items-center">
          {[0, 1, 2, 3].map((slotIdx) => {
            const token = tokens.find(t => t.tokenId === slotIdx);
            return (
              <div
                key={slotIdx}
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center relative shadow-sm border transition-transform"
                style={{
                  backgroundColor: isDarkMode ? '#1c1917' : isFlatMinimal ? '#FFFFFF' : '#F8FAFC',
                  borderColor: colorHex
                }}
              >
                {/* Empty slot pip dot */}
                {!token && (
                  <div
                    className="w-2.5 h-2.5 rounded-full opacity-70"
                    style={{ backgroundColor: colorHex, boxShadow: `0 0 6px ${colorHex}` }}
                  ></div>
                )}
                {/* Token */}
                {token && (
                  <Token
                    color={token.color}
                    isValidMove={token.isValid}
                    isHopping={token.isHopping}
                    isCaptured={token.isCaptured}
                    onClick={() => onSelectToken(token.tokenId)}
                    size="sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom spacer / subtle label */}
      <div className="text-[9px] font-bold text-white/80 uppercase tracking-widest drop-shadow-sm select-none">
        {colorName}
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
                    isHopping={occ.isHopping}
                    isCaptured={occ.isCaptured}
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
            <Token key={`rad_fin_${idx}`} color={t.color} size="sm" isHopping={t.isHopping} />
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
                    isHopping={tok.isHopping}
                    isCaptured={tok.isCaptured}
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
