import React, { useState, useEffect, useRef } from 'react';
import Token from './Token';
import { getGlobalPosition } from '../game/rules';
import { BOARD_THEMES } from '../game/boardThemes';
import { sound } from '../utils/soundEngine';

export default function LudoBoard({
  gameState,
  onSelectToken,
  validTokens = [],
  themeName = 'classic',
  moveTimer = null
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
      {/* Pachisi Heritage: Ornate outer temple frame */}
      {currentTheme.isPachisi ? (
        <div className="relative w-[min(96vw,560px)] aspect-square flex items-center justify-center">
          {/* Decorative SVG vine border overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 560 560" preserveAspectRatio="xMidYMid meet">
            {/* Outer maroon frame */}
            <rect x="2" y="2" width="556" height="556" rx="18" ry="18" fill="none" stroke="#5C2A00" strokeWidth="10" />
            <rect x="8" y="8" width="544" height="544" rx="14" ry="14" fill="none" stroke="#A0522D" strokeWidth="3" />
            <rect x="14" y="14" width="532" height="532" rx="10" ry="10" fill="none" stroke="#D4A017" strokeWidth="1.5" />
            {/* Corner lotus ornaments */}
            {[[28,28],[532,28],[28,532],[532,532]].map(([cx,cy], i) => (
              <g key={i} transform={`translate(${cx},${cy})`}>
                <circle r="12" fill="#8B4513" opacity="0.9" />
                <circle r="8" fill="#D4A017" opacity="0.9" />
                <circle r="4" fill="#FAF0DC" opacity="1" />
                {[0,60,120,180,240,300].map((angle, j) => (
                  <ellipse key={j} cx={Math.cos(angle*Math.PI/180)*9} cy={Math.sin(angle*Math.PI/180)*9}
                    rx="4" ry="2.5" fill="#C0392B" opacity="0.8"
                    transform={`rotate(${angle},${Math.cos(angle*Math.PI/180)*9},${Math.sin(angle*Math.PI/180)*9})`} />
                ))}
              </g>
            ))}
            {/* Top/Bottom vine dividers */}
            {[0, 1].map(side => (
              <g key={side} transform={side === 1 ? 'translate(0,560) scale(1,-1)' : ''}>
                {[80,160,240,320,400,480].map((x, i) => (
                  <g key={i}>
                    <ellipse cx={x} cy="10" rx="12" ry="5" fill="#8B4513" opacity="0.5" />
                    <circle cx={x} cy="10" r="3" fill="#D4A017" opacity="0.7" />
                  </g>
                ))}
              </g>
            ))}
            {/* Left/Right vine dividers */}
            {[0, 1].map(side => (
              <g key={side} transform={side === 1 ? 'translate(560,0) scale(-1,1)' : ''}>
                {[80,160,240,320,400,480].map((y, i) => (
                  <g key={i}>
                    <ellipse cx="10" cy={y} rx="5" ry="12" fill="#8B4513" opacity="0.5" />
                    <circle cx="10" cy={y} r="3" fill="#D4A017" opacity="0.7" />
                  </g>
                ))}
              </g>
            ))}
          </svg>

          {/* Actual Board */}
          <div
            className={`w-[min(84vw,480px)] aspect-square ${currentTheme.boardBg} rounded-2xl p-2 border-4 shadow-2xl relative overflow-hidden transition-colors duration-500`}
            style={{ borderColor: '#8B4513', boxShadow: '0 8px 40px rgba(92,42,0,0.7), inset 0 0 20px rgba(212,160,23,0.08)' }}
          >
            <Classic4PlayerBoard
              gameState={gameState}
              cellOccupants={cellOccupants}
              homeBases={homeBases}
              finishOccupants={finishOccupants}
              onSelectToken={onSelectToken}
              theme={currentTheme}
              moveTimer={moveTimer}
            />
          </div>
        </div>
      ) : (
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
              moveTimer={moveTimer}
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
              moveTimer={moveTimer}
            />
          )}
        </div>
      )}
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
  theme,
  moveTimer
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

  const gapBg = theme.isPachisi ? '#A0522D' : theme.isDarkMode ? '#2a2a2a' : '#94a3b8';

  return (
    <div
      className={`w-full h-full grid grid-cols-15 grid-rows-15 rounded-2xl overflow-hidden p-0.5 border ${theme.gridBorder}`}
      style={{ gap: '1px', backgroundColor: gapBg }}
    >
      {/* 1. TOP-LEFT: Red Home Yard (rows 0-5, cols 0-5) */}
      <div className={`col-span-6 row-span-6 ${theme.redYard} rounded-tl-xl p-1.5 md:p-2 flex items-center justify-center border-4 relative transition-all duration-300`}
        style={theme.isPachisi ? { borderColor: '#7F1D1D' } : {}}>
        {/* Pachisi: corner flourish */}
        {theme.isPachisi && (
          <div className="absolute top-1 right-1 text-[10px] opacity-60 select-none">🪷</div>
        )}
        <HomeYard
          colorHex={redPlayer?.color?.hex || '#EF4444'}
          colorName="Red"
          player={redPlayer}
          tokens={redTokens}
          onSelectToken={onSelectToken}
          theme={theme}
          isCurrentTurn={gameState.currentTurnIndex === redPlayer?.playerIndex}
          moveTimer={moveTimer}
        />
      </div>

      {/* 2. TOP-MIDDLE: Top Runway Track (rows 0-5, cols 6-8) */}
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6" style={{ gap: '1px', backgroundColor: gapBg }}>
        {renderSubGrid(0, 5, 6, 8, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players)}
      </div>

      {/* 3. TOP-RIGHT: Green Home Yard (rows 0-5, cols 9-14) */}
      <div className={`col-span-6 row-span-6 ${theme.greenYard} rounded-tr-xl p-1.5 md:p-2 flex items-center justify-center border-4 relative transition-all duration-300`}
        style={theme.isPachisi ? { borderColor: '#14532D' } : {}}>
        {theme.isPachisi && (
          <div className="absolute top-1 left-1 text-[10px] opacity-60 select-none">🪷</div>
        )}
        <HomeYard
          colorHex={greenPlayer?.color?.hex || '#10B981'}
          colorName="Green"
          player={greenPlayer}
          tokens={greenTokens}
          onSelectToken={onSelectToken}
          theme={theme}
          isCurrentTurn={gameState.currentTurnIndex === greenPlayer?.playerIndex}
          moveTimer={moveTimer}
        />
      </div>

      {/* 4. MIDDLE-LEFT: Left Runway Track (rows 6-8, cols 0-5) */}
      <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3" style={{ gap: '1px', backgroundColor: gapBg }}>
        {renderSubGrid(6, 8, 0, 5, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players)}
      </div>

      {/* 5. CENTER: Finish Victory Triangles (rows 6-8, cols 6-8) */}
      <div
        className="col-span-3 row-span-3 relative flex items-center justify-center shadow-2xl overflow-hidden"
        style={theme.isPachisi
          ? { backgroundColor: '#FAF0DC', border: '2px solid #8B4513' }
          : { backgroundColor: '#0d0d0d', border: '1px solid rgba(251,191,36,0.5)' }}
      >
        {/* Radial Glow */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: theme.isPachisi
              ? 'radial-gradient(circle at center, rgba(212,160,23,0.25) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(251,191,36,0.28) 0%, transparent 75%)'
          }}
        />
        {/* Pinwheel Triangles */}
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Red: left */}
            <polygon points="0,0 50,50 0,100" fill={theme.centerWedges.red} opacity={theme.isPachisi ? '1' : '0.95'} />
            {/* Green: top */}
            <polygon points="0,0 50,50 100,0" fill={theme.centerWedges.green} opacity={theme.isPachisi ? '1' : '0.95'} />
            {/* Yellow: right */}
            <polygon points="100,0 50,50 100,100" fill={theme.centerWedges.yellow} opacity={theme.isPachisi ? '1' : '0.95'} />
            {/* Blue: bottom */}
            <polygon points="0,100 50,50 100,100" fill={theme.centerWedges.blue} opacity={theme.isPachisi ? '1' : '0.95'} />
            {/* Pachisi: white dividing lines for traditional look */}
            {theme.isPachisi && (
              <>
                <line x1="0" y1="0" x2="50" y2="50" stroke="#FAF0DC" strokeWidth="1.5" />
                <line x1="100" y1="0" x2="50" y2="50" stroke="#FAF0DC" strokeWidth="1.5" />
                <line x1="100" y1="100" x2="50" y2="50" stroke="#FAF0DC" strokeWidth="1.5" />
                <line x1="0" y1="100" x2="50" y2="50" stroke="#FAF0DC" strokeWidth="1.5" />
              </>
            )}
          </svg>
        </div>
        {/* Center Hub */}
        {theme.isPachisi ? (
          <div className="absolute w-7 h-7 rounded-full flex items-center justify-center z-10"
            style={{ backgroundColor: '#FAF0DC', border: '2.5px solid #8B4513', boxShadow: '0 0 10px rgba(139,69,19,0.6)' }}>
            <span className="text-[10px]">✦</span>
          </div>
        ) : (
          <div className="absolute w-6 h-6 rounded-full bg-black/90 border border-amber-300 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.8)] z-0" />
        )}
        {/* Finish Tokens Stack */}
        <div className="z-10 flex flex-wrap items-center justify-center gap-1 p-1 max-w-[85%] max-h-[85%] overflow-hidden">
          {finishOccupants.map((t, idx) => (
            <Token key={`fin_${idx}`} color={t.color} size="sm" isCaptured={t.isCaptured} stackCount={1} />
          ))}
          {finishOccupants.length === 0 && (
            <span className={`text-sm md:text-base font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
              theme.isPachisi ? 'text-[#8B4513]' : 'text-amber-300'
            }`}>{theme.isPachisi ? '🪔' : '🏆'}</span>
          )}
        </div>
      </div>

      {/* 6. MIDDLE-RIGHT: Right Runway Track (rows 6-8, cols 9-14) */}
      <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3" style={{ gap: '1px', backgroundColor: gapBg }}>
        {renderSubGrid(6, 8, 9, 14, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players)}
      </div>

      {/* 7. BOTTOM-LEFT: Blue Home Yard (rows 9-14, cols 0-5) */}
      <div className={`col-span-6 row-span-6 ${theme.blueYard} rounded-bl-xl p-1.5 md:p-2 flex items-center justify-center border-4 relative transition-all duration-300`}
        style={theme.isPachisi ? { borderColor: '#1E3A8A' } : {}}>
        {theme.isPachisi && (
          <div className="absolute bottom-1 right-1 text-[10px] opacity-60 select-none">🪷</div>
        )}
        <HomeYard
          colorHex={bluePlayer?.color?.hex || '#3B82F6'}
          colorName="Blue"
          player={bluePlayer}
          tokens={blueTokens}
          onSelectToken={onSelectToken}
          theme={theme}
          isCurrentTurn={gameState.currentTurnIndex === bluePlayer?.playerIndex}
          moveTimer={moveTimer}
        />
      </div>

      {/* 8. BOTTOM-MIDDLE: Bottom Runway Track (rows 9-14, cols 6-8) */}
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6" style={{ gap: '1px', backgroundColor: gapBg }}>
        {renderSubGrid(9, 14, 6, 8, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players)}
      </div>

      {/* 9. BOTTOM-RIGHT: Yellow Home Yard (rows 9-14, cols 9-14) */}
      <div className={`col-span-6 row-span-6 ${theme.yellowYard} rounded-br-xl p-1.5 md:p-2 flex items-center justify-center border-4 relative transition-all duration-300`}
        style={theme.isPachisi ? { borderColor: '#78350F' } : {}}>
        {theme.isPachisi && (
          <div className="absolute bottom-1 left-1 text-[10px] opacity-60 select-none">🪷</div>
        )}
        <HomeYard
          colorHex={yellowPlayer?.color?.hex || '#F59E0B'}
          colorName="Yellow"
          player={yellowPlayer}
          tokens={yellowTokens}
          onSelectToken={onSelectToken}
          theme={theme}
          isCurrentTurn={gameState.currentTurnIndex === yellowPlayer?.playerIndex}
          moveTimer={moveTimer}
        />
      </div>
    </div>
  );
}

/**
 * Renders Home Base Yard Box with classic inset square, diamond, and 4 Token Slots.
 * For Pachisi theme: ornate ivory inner square with colored border and larger token circles.
 */
function HomeYard({ colorHex, colorName, player, tokens, onSelectToken, theme, isCurrentTurn, moveTimer }) {
  if (!player) {
    return (
      <div className="w-full h-full rounded-xl flex flex-col items-center justify-center"
        style={theme.isPachisi
          ? { backgroundColor: 'rgba(250,240,220,0.4)', border: '1px solid rgba(160,82,45,0.4)' }
          : { backgroundColor: 'rgba(2,6,23,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
        }>
        <span className={`text-[10px] uppercase font-bold ${ theme.isPachisi ? 'text-[#8B4513]' : 'text-slate-400' }`}>Vacant</span>
      </div>
    );
  }

  const isFestive = theme.isFestive;
  const isDarkMode = theme.isDarkMode;
  const isPachisi = theme.isPachisi;
  const isMoveTimerActive = isCurrentTurn && moveTimer?.active;
  const moveSeconds = moveTimer ? moveTimer.seconds : 6;
  const movePercent = moveTimer ? Math.max(0, (moveTimer.seconds / (moveTimer.total || 6)) * 100) : 100;

  if (isPachisi) {
    /* ── Pachisi Heritage HomeYard ─────────────────────────────────── */
    return (
      <div className="w-full h-full flex flex-col items-center justify-between relative p-1">
        {/* Username badge */}
        <div className="w-full flex items-center justify-between px-0.5 z-10">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-white drop-shadow truncate max-w-[65%]">
            {player.username}
          </span>
          {isMoveTimerActive ? (
            <span
              className="text-[8px] md:text-[9px] font-mono font-black px-1 py-0.5 rounded-full text-white animate-pulse"
              style={{ backgroundColor: colorHex }}
            >⏱️ {moveSeconds}s</span>
          ) : (
            <span className="w-2 h-2 rounded-full ring-1 ring-white/60" style={{ backgroundColor: colorHex }} />
          )}
        </div>

        {/* Ivory inner square with thick colored border */}
        <div
          className="w-[84%] aspect-square flex items-center justify-center relative shadow-lg"
          style={{
            backgroundColor: '#FAF0DC',
            border: `3px solid ${colorHex}`,
            boxShadow: `0 0 12px ${colorHex}88, inset 0 0 8px rgba(212,160,23,0.15)`,
            borderRadius: '6px'
          }}
        >
          {/* Inner decorative ring */}
          <div
            className="absolute inset-[6px]"
            style={{
              border: '1.5px solid rgba(139,69,19,0.4)',
              borderRadius: '4px',
              pointerEvents: 'none'
            }}
          />
          {/* 2x2 token circles grid */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-2.5 gap-2 items-center justify-items-center">
            {[0, 1, 2, 3].map((slotIdx) => {
              const token = tokens.find(t => t.tokenId === slotIdx);
              return (
                <div
                  key={slotIdx}
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center relative shadow-sm border-2 transition-transform"
                  style={{ backgroundColor: '#FAF0DC', borderColor: colorHex }}
                >
                  {!token && (
                    <div className="w-2.5 h-2.5 rounded-full opacity-80"
                      style={{ backgroundColor: colorHex }} />
                  )}
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

        {/* Move Timer Bar or Color Name */}
        {isMoveTimerActive ? (
          <div className="w-[85%] h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(139,69,19,0.3)' }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${movePercent}%`, backgroundColor: colorHex }}
            />
          </div>
        ) : (
          <div className="text-[8px] font-black uppercase tracking-widest select-none" style={{ color: '#FAF0DC' }}>
            {colorName}
          </div>
        )}
      </div>
    );
  }

  /* ── Default HomeYard (Dark / Neon / Festive themes) ──────────── */
  return (
    <div className="w-full h-full rounded-xl p-1.5 md:p-2 flex flex-col items-center justify-between relative overflow-hidden">
      {/* Festive Corner Ornament */}
      {isFestive && (
        <div className="absolute top-1 left-1 text-[12px] opacity-70 select-none">🪷</div>
      )}

      {/* Header with Username & Move Timer Badge */}
      <div className="w-full flex items-center justify-between px-1 z-10">
        <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white drop-shadow truncate max-w-[65%]">
          {player.username}
        </span>
        {isMoveTimerActive ? (
          <span
            className="text-[9px] md:text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full text-white animate-pulse shadow-md flex items-center gap-0.5"
            style={{ backgroundColor: colorHex, boxShadow: `0 0 10px ${colorHex}` }}
          >
            ⏱️ {moveSeconds}s
          </span>
        ) : (
          <span
            className="w-2.5 h-2.5 rounded-full ring-2 ring-white/60 shadow-sm"
            style={{ backgroundColor: colorHex }}
          />
        )}
      </div>

      {/* Inset Base Square with Diamond Pips */}
      <div
        className={`w-[82%] aspect-square rounded-xl shadow-lg border flex items-center justify-center relative p-1 transition-all ${
          isDarkMode ? 'bg-[#121212] border-white/15 shadow-black/80' : 'bg-white border-black/10'
        }`}
      >
        {/* Rotated Diamond Background */}
        <div
          className="w-[74%] aspect-square rounded-lg rotate-45 border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: colorHex,
            backgroundColor: isDarkMode ? `${colorHex}1a` : `${colorHex}25`,
            boxShadow: isDarkMode ? `0 0 10px ${colorHex}35` : 'none'
          }}
        />

        {/* 4 Token Bases in 2x2 Dice Pip Grid */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-2.5 gap-2 items-center justify-items-center">
          {[0, 1, 2, 3].map((slotIdx) => {
            const token = tokens.find(t => t.tokenId === slotIdx);
            return (
              <div
                key={slotIdx}
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center relative shadow-sm border transition-transform"
                style={{
                  backgroundColor: isDarkMode ? '#1c1917' : '#F8FAFC',
                  borderColor: colorHex
                }}
              >
                {!token && (
                  <div
                    className="w-2.5 h-2.5 rounded-full opacity-70"
                    style={{ backgroundColor: colorHex, boxShadow: `0 0 6px ${colorHex}` }}
                  />
                )}
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

      {/* Shrinking Move Timer Progress Bar */}
      {isMoveTimerActive ? (
        <div className="w-[85%] h-1 bg-black/40 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${movePercent}%`,
              backgroundColor: colorHex,
              boxShadow: `0 0 8px ${colorHex}`
            }}
          />
        </div>
      ) : (
        <div className="text-[9px] font-bold text-white/80 uppercase tracking-widest drop-shadow-sm select-none">
          {colorName}
        </div>
      )}
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
            <span
              className="font-black select-none"
              style={{
                fontSize: theme.isPachisi ? '11px' : '9px',
                color: theme.isPachisi ? '#5C2A00' : 'rgba(255,255,255,0.5)',
                textShadow: theme.isPachisi ? '0 1px 2px rgba(92,42,0,0.4)' : 'none'
              }}
            >{markerText}</span>
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
