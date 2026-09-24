import React, { useState, useEffect, useRef } from 'react';
import Token from './Token';
import Dice from './Dice';
import StickerOverlay from './StickerOverlay';
import { getGlobalPosition } from '../game/rules';
import { getBoardRotation } from '../game/board';
import { BOARD_THEMES } from '../game/boardThemes';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function LudoBoard({
  gameState,
  onSelectToken,
  validTokens = [],
  themeName = 'classic',
  moveTimer = null,
  myPlayerIndex = null,
  diceProps = null,
  stickers = []
}) {
  if (!gameState) return null;

  const currentTheme = BOARD_THEMES[themeName] || BOARD_THEMES.classic;
  const playerCount = gameState.players.length;
  const config = gameState.config;
  const boardRotation = 0; // Keep board fixed in standard standard orientation (Red Top-Left, Green Top-Right, Yellow Bottom-Right, Blue Bottom-Left)


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
    <div className="w-full h-full flex items-center justify-center select-none">
      {/* Pachisi Heritage: Ornate outer temple frame */}
      {currentTheme.isPachisi ? (
        <div className="relative aspect-square flex items-center justify-center" style={{ width: 'min(90vw, 90dvh, 560px)' }}>
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
            className={`aspect-square ${currentTheme.boardBg} rounded-2xl p-2 border-4 shadow-2xl relative overflow-hidden transition-colors duration-500`}
            style={{ width: 'min(calc(100vw - 20px), calc(100dvh - 120px), 500px)', height: 'min(calc(100vw - 20px), calc(100dvh - 120px), 500px)', borderColor: '#8B4513', boxShadow: '0 8px 40px rgba(92,42,0,0.7), inset 0 0 20px rgba(212,160,23,0.08)' }}
          >
            <Classic4PlayerBoard
              gameState={gameState}
              cellOccupants={cellOccupants}
              homeBases={homeBases}
              finishOccupants={finishOccupants}
              onSelectToken={onSelectToken}
              theme={currentTheme}
              moveTimer={moveTimer}
              boardRotation={boardRotation}
              diceProps={diceProps}
            />
            {/* Floating Sticker Reaction Layer */}
            <StickerOverlay stickers={stickers} playerCount={playerCount} />
          </div>
        </div>
      ) : (
        <div 
          className={`aspect-square ${currentTheme.boardBg} rounded-3xl p-2.5 sm:p-3.5 border-2 ${currentTheme.boardBorder} shadow-2xl relative backdrop-blur-xl transition-colors duration-500`}
          style={{
            width: 'min(calc(100vw - 24px), calc(100dvh - 140px), 520px)',
            height: 'min(calc(100vw - 24px), calc(100dvh - 140px), 520px)',
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
              boardRotation={boardRotation}
              diceProps={diceProps}
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
              myPlayerIndex={myPlayerIndex}
              diceProps={diceProps}
            />
          )}
          {/* Floating Sticker Reaction Layer */}
          <StickerOverlay stickers={stickers} playerCount={playerCount} />
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
  moveTimer,
  boardRotation = 0,
  diceProps = null
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
  // Resolve players mapped strictly to their matching home color yard
  const redPlayer = gameState.players.find(p => p.color?.key === 'red');
  const greenPlayer = gameState.players.find(p => p.color?.key === 'green');
  const yellowPlayer = gameState.players.find(p => p.color?.key === 'yellow');
  const bluePlayer = gameState.players.find(p => p.color?.key === 'blue');

  const redTokens = redPlayer ? (homeBases[redPlayer.playerIndex] || []) : [];
  const greenTokens = greenPlayer ? (homeBases[greenPlayer.playerIndex] || []) : [];
  const yellowTokens = yellowPlayer ? (homeBases[yellowPlayer.playerIndex] || []) : [];
  const blueTokens = bluePlayer ? (homeBases[bluePlayer.playerIndex] || []) : [];

  // Robust Turn Color Resolution (supports string, object { key }, { name }, or playerIndex)
  const currentTurnPlayer = (gameState.players && gameState.currentTurnIndex !== undefined && gameState.players[gameState.currentTurnIndex])
    ? gameState.players[gameState.currentTurnIndex]
    : gameState.players?.[0];

  let turnColor = 'red';
  if (currentTurnPlayer) {
    if (typeof currentTurnPlayer.color === 'string') {
      turnColor = currentTurnPlayer.color.toLowerCase();
    } else if (currentTurnPlayer.color?.key) {
      turnColor = currentTurnPlayer.color.key.toLowerCase();
    } else if (currentTurnPlayer.color?.name) {
      turnColor = currentTurnPlayer.color.name.toLowerCase();
    } else {
      const idx = currentTurnPlayer.playerIndex ?? gameState.currentTurnIndex ?? 0;
      if (idx === 0) turnColor = 'red';
      else if (idx === 1) turnColor = (gameState.players?.length === 2 ? 'yellow' : 'green');
      else if (idx === 2) turnColor = 'yellow';
      else if (idx === 3) turnColor = 'blue';
    }
  }

  // 4 Constant Corner Boxes Configuration (Anchored in the 4 outer corners outside the board grid)
  const CORNER_BOXES = [
    {
      id: 'red',
      key: 'red',
      name: 'Red',
      player: redPlayer,
      colorHex: redPlayer?.color?.hex || '#EF4444',
      pos: { top: '0%', left: '0%' }
    },
    {
      id: 'green',
      key: 'green',
      name: 'Green',
      player: greenPlayer,
      colorHex: greenPlayer?.color?.hex || '#10B981',
      pos: { top: '0%', left: '100%' }
    },
    {
      id: 'yellow',
      key: 'yellow',
      name: 'Yellow',
      player: yellowPlayer,
      colorHex: yellowPlayer?.color?.hex || '#F59E0B',
      pos: { top: '100%', left: '100%' }
    },
    {
      id: 'blue',
      key: 'blue',
      name: 'Blue',
      player: bluePlayer,
      colorHex: bluePlayer?.color?.hex || '#3B82F6',
      pos: { top: '100%', left: '0%' }
    }
  ];

  const activeBox = CORNER_BOXES.find(b => b.key === turnColor) || CORNER_BOXES[0];
  const activeBoxPos = activeBox.pos;
  const activeBoxColor = activeBox.colorHex;

  const gapBg = theme?.isPachisi ? '#5C2A00' : 'rgba(255, 255, 255, 0.08)';

  return (
    <div
      className={`w-full h-full relative grid grid-cols-15 grid-rows-15 rounded-2xl p-1 border ${theme.gridBorder} transition-transform duration-500 ease-out`}
      style={{
        gap: '1px',
        backgroundColor: gapBg,
        transform: `rotate(${boardRotation}deg)`
      }}
    >
      {/* 1. TOP-LEFT: Red Home Yard (rows 0-5, cols 0-5) */}
      <div className={`col-span-6 row-span-6 ${theme.redYard} rounded-tl-xl p-1.5 md:p-2 flex items-center justify-center border-4 relative transition-all duration-300 ${
        gameState.currentTurnIndex === redPlayer?.playerIndex ? 'animate-yard-pulse' : ''
      }`}
        style={{
          borderColor: redPlayer?.color?.hex || '#EF4444',
          '--yard-glow-color': redPlayer?.color?.hex || '#EF4444',
          boxShadow: gameState.currentTurnIndex === redPlayer?.playerIndex
            ? `0 0 24px ${redPlayer?.color?.hex || '#EF4444'}, inset 0 0 16px ${redPlayer?.color?.hex || '#EF4444'}55`
            : undefined
        }}>
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
          counterRotation={boardRotation}
        />
      </div>

      {/* 2. TOP-MIDDLE: Top Runway Track (rows 0-5, cols 6-8) */}
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6" style={{ gap: '1px', backgroundColor: gapBg }}>
        {renderSubGrid(0, 5, 6, 8, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players, boardRotation)}
      </div>

      {/* 3. TOP-RIGHT: Green Home Yard (rows 0-5, cols 9-14) */}
      <div className={`col-span-6 row-span-6 ${theme.greenYard} rounded-tr-xl p-1.5 md:p-2 flex items-center justify-center border-4 relative transition-all duration-300 ${
        gameState.currentTurnIndex === greenPlayer?.playerIndex ? 'animate-yard-pulse' : ''
      }`}
        style={{
          borderColor: greenPlayer?.color?.hex || '#10B981',
          '--yard-glow-color': greenPlayer?.color?.hex || '#10B981',
          boxShadow: gameState.currentTurnIndex === greenPlayer?.playerIndex
            ? `0 0 24px ${greenPlayer?.color?.hex || '#10B981'}, inset 0 0 16px ${greenPlayer?.color?.hex || '#10B981'}55`
            : undefined
        }}>
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
          counterRotation={boardRotation}
        />
      </div>

      {/* 4. MIDDLE-LEFT: Left Runway Track (rows 6-8, cols 0-5) */}
      <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3" style={{ gap: '1px', backgroundColor: gapBg }}>
        {renderSubGrid(6, 8, 0, 5, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players, boardRotation)}
      </div>

      {/* 5. CENTER: Finish Victory Triangles & BUDO Center Wedge (rows 6-8, cols 6-8) */}
      <div
        className="col-span-3 row-span-3 relative flex items-center justify-center shadow-2xl overflow-hidden rounded-xl"
        style={theme.isPachisi
          ? { backgroundColor: '#FAF0DC', border: '2px solid #8B4513' }
          : { backgroundColor: '#090d16', border: '2px solid rgba(251,191,36,0.6)', boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 15px rgba(251,191,36,0.15)' }}
      >
        {/* Radial Center Glow */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: theme.isPachisi
              ? 'radial-gradient(circle at center, rgba(212,160,23,0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(251,191,36,0.35) 0%, transparent 75%)'
          }}
        />
        {/* Pinwheel Triangles */}
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Red: left */}
            <polygon points="0,0 50,50 0,100" fill={theme.centerWedges.red} opacity={theme.isPachisi ? '1' : '0.92'} />
            {/* Green: top */}
            <polygon points="0,0 50,50 100,0" fill={theme.centerWedges.green} opacity={theme.isPachisi ? '1' : '0.92'} />
            {/* Yellow: right */}
            <polygon points="100,0 50,50 100,100" fill={theme.centerWedges.yellow} opacity={theme.isPachisi ? '1' : '0.92'} />
            {/* Blue: bottom */}
            <polygon points="0,100 50,50 100,100" fill={theme.centerWedges.blue} opacity={theme.isPachisi ? '1' : '0.92'} />
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

        {/* Finished tokens summary badge or center victory emblem */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
          {finishOccupants.length > 0 ? (
            <div className="bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-full text-[8px] font-black text-amber-300 border border-amber-400/50 shadow-md">
              🏆 {finishOccupants.length}/4
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-950/85 border border-amber-400/60 flex items-center justify-center shadow-lg">
              <span className="text-amber-400 font-black text-xs">★</span>
            </div>
          )}
          <span className="text-[7px] font-black uppercase text-amber-300 tracking-wider mt-0.5 drop-shadow">
            BUDO
          </span>
        </div>
      </div>

      {/* 4 CONSTANT CORNER DICE BOXES (Fixed, always visible, non-moving) */}
      {CORNER_BOXES.map((box) => {
        const isCurrentTurnBox = turnColor === box.key;
        return (
          <div
            key={box.id}
            className={`absolute z-20 pointer-events-none flex items-center justify-center rounded-2xl transition-all duration-300 ${
              isCurrentTurnBox
                ? 'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-slate-950/90 border-2 shadow-2xl'
                : 'w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 bg-slate-950/40 border border-slate-800/60 opacity-40'
            }`}
            style={{
              top: box.pos.top,
              left: box.pos.left,
              borderColor: isCurrentTurnBox ? box.colorHex : 'rgba(255,255,255,0.12)',
              boxShadow: isCurrentTurnBox
                ? `0 0 25px ${box.colorHex}88, inset 0 0 14px ${box.colorHex}44`
                : undefined,
              transform: `translate(-50%, -50%) rotate(${-boardRotation}deg)`
            }}
          >
            {/* Empty Box Placeholder when dice is in another corner */}
            {!isCurrentTurnBox && (
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-dashed flex items-center justify-center opacity-30"
                style={{ borderColor: box.colorHex }}
              >
                <span className="text-xs" style={{ color: box.colorHex }}>🎲</span>
              </div>
            )}
          </div>
        );
      })}

      {/* 🎲 SINGLE TRAVELING DICE: Smoothly glides & flies between the 4 fixed boxes (450ms) */}
      {diceProps && (
        <div 
          className="absolute z-30 pointer-events-auto flex items-center justify-center"
          style={{
            top: activeBoxPos.top,
            left: activeBoxPos.left,
            transform: `translate(-50%, -50%) rotate(${-boardRotation}deg)`,
            transition: 'top 450ms cubic-bezier(0.34, 1.56, 0.64, 1), left 450ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <Dice
            value={diceProps.value}
            isRolling={diceProps.isRolling}
            disabled={diceProps.disabled}
            onRoll={diceProps.onRoll}
            playerColor={diceProps.playerColor || activeBoxColor}
            timerSeconds={diceProps.timerSeconds}
            isUrgent={diceProps.isUrgent}
            inCenter={true}
          />
        </div>
      )}

      {/* 6. MIDDLE-RIGHT: Right Runway Track (rows 6-8, cols 9-14) */}
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6" style={{ gap: '1px', backgroundColor: gapBg }}>
        {renderSubGrid(6, 8, 9, 14, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players, boardRotation)}
      </div>

      {/* 7. BOTTOM-LEFT: Blue Home Yard (rows 9-14, cols 0-5) */}
      <div className={`col-span-6 row-span-6 ${theme.blueYard} rounded-bl-xl p-1.5 md:p-2 flex items-center justify-center border-4 relative transition-all duration-300 ${
        gameState.currentTurnIndex === bluePlayer?.playerIndex ? 'animate-yard-pulse' : ''
      }`}
        style={{
          borderColor: bluePlayer?.color?.hex || '#3B82F6',
          '--yard-glow-color': bluePlayer?.color?.hex || '#3B82F6',
          boxShadow: gameState.currentTurnIndex === bluePlayer?.playerIndex
            ? `0 0 24px ${bluePlayer?.color?.hex || '#3B82F6'}, inset 0 0 16px ${bluePlayer?.color?.hex || '#3B82F6'}55`
            : undefined
        }}>
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
          counterRotation={boardRotation}
        />
      </div>

      {/* 8. BOTTOM-MIDDLE: Bottom Runway Track (rows 9-14, cols 6-8) */}
      <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6" style={{ gap: '1px', backgroundColor: gapBg }}>
        {renderSubGrid(9, 14, 6, 8, trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, gameState.players, boardRotation)}
      </div>

      {/* 9. BOTTOM-RIGHT: Yellow Home Yard (rows 9-14, cols 9-14) */}
      <div className={`col-span-6 row-span-6 ${theme.yellowYard} rounded-br-xl p-1.5 md:p-2 flex items-center justify-center border-4 relative transition-all duration-300 ${
        gameState.currentTurnIndex === yellowPlayer?.playerIndex ? 'animate-yard-pulse' : ''
      }`}
        style={{
          borderColor: yellowPlayer?.color?.hex || '#EAB308',
          '--yard-glow-color': yellowPlayer?.color?.hex || '#EAB308',
          boxShadow: gameState.currentTurnIndex === yellowPlayer?.playerIndex
            ? `0 0 24px ${yellowPlayer?.color?.hex || '#EAB308'}, inset 0 0 16px ${yellowPlayer?.color?.hex || '#EAB308'}55`
            : undefined
        }}>
        {theme.isPachisi && (
          <div className="absolute bottom-1 left-1 text-[10px] opacity-60 select-none">🪷</div>
        )}
        <HomeYard
          colorHex={yellowPlayer?.color?.hex || '#EAB308'}
          colorName="Yellow"
          player={yellowPlayer}
          tokens={yellowTokens}
          onSelectToken={onSelectToken}
          theme={theme}
          isCurrentTurn={gameState.currentTurnIndex === yellowPlayer?.playerIndex}
          moveTimer={moveTimer}
          counterRotation={boardRotation}
        />
      </div>
    </div>
  );
}

/**
 * Renders Home Base Yard Box with classic inset square, diamond, and 4 Token Slots.
 */
function HomeYard({ colorHex, colorName, player, tokens, onSelectToken, theme, isCurrentTurn, moveTimer, counterRotation = 0 }) {
  if (!player) {
    return (
      <div className="w-full h-full rounded-xl flex flex-col items-center justify-center"
        style={theme.isPachisi
          ? { backgroundColor: 'rgba(250,240,220,0.4)', border: '1px solid rgba(160,82,45,0.4)' }
          : { backgroundColor: 'rgba(2,6,23,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
        }>
        <span
          className={`text-[10px] uppercase font-bold ${ theme.isPachisi ? 'text-[#8B4513]' : 'text-slate-400' }`}
          style={counterRotation ? { transform: `rotate(${-counterRotation}deg)` } : undefined}
        >
          Vacant
        </span>
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
        {/* Username badge + Turn Indicator */}
        <div
          className="w-full flex items-center justify-between px-0.5 z-10"
          style={counterRotation ? { transform: `rotate(${-counterRotation}deg)` } : undefined}
        >
          <div className="flex items-center gap-1 max-w-[70%] truncate">
            {isCurrentTurn && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
            )}
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-white drop-shadow truncate">
              {player.username}
            </span>
          </div>
          {isMoveTimerActive ? (
            <span
              className="text-[8px] md:text-[9px] font-mono font-black px-1 py-0.5 rounded-full text-white animate-pulse"
              style={{ backgroundColor: colorHex }}
            >⏱️ {moveSeconds}s</span>
          ) : isCurrentTurn ? (
            <span className="text-[8px] font-black px-1 rounded bg-amber-400 text-slate-950 animate-pulse">
              TURN
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full ring-1 ring-white/60" style={{ backgroundColor: colorHex }} />
          )}
        </div>

        {/* Ivory inner square with thick colored border & 2x2 token grid */}
        <div
          className="w-[84%] aspect-square flex items-center justify-center relative shadow-lg"
          style={{
            backgroundColor: '#FAF0DC',
            border: `3px solid ${colorHex}`,
            boxShadow: isCurrentTurn 
              ? `0 0 16px ${colorHex}, inset 0 0 10px rgba(212,160,23,0.3)`
              : `0 0 12px ${colorHex}88, inset 0 0 8px rgba(212,160,23,0.15)`,
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
                      counterRotation={counterRotation}
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
          <div
            className="text-[8px] font-black uppercase tracking-widest select-none"
            style={{
              color: '#FAF0DC',
              transform: counterRotation ? `rotate(${-counterRotation}deg)` : undefined
            }}
          >
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

      {/* Header with Username, Active Turn Glow & Move Timer Badge */}
      <div
        className="w-full flex items-center justify-between px-1 z-10"
        style={counterRotation ? { transform: `rotate(${-counterRotation}deg)` } : undefined}
      >
        <div className="flex items-center gap-1 max-w-[65%] truncate">
          {isCurrentTurn && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
          )}
          <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white drop-shadow truncate">
            {player.username}
          </span>
        </div>
        {isMoveTimerActive ? (
          <span
            className="text-[9px] md:text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full text-white animate-pulse shadow-md flex items-center gap-0.5"
            style={{ backgroundColor: colorHex, boxShadow: `0 0 10px ${colorHex}` }}
          >
            ⏱️ {moveSeconds}s
          </span>
        ) : isCurrentTurn ? (
          <span
            className="text-[8px] md:text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 animate-pulse shadow-md"
          >
            TURN
          </span>
        ) : (
          <span
            className="w-2.5 h-2.5 rounded-full ring-2 ring-white/60 shadow-sm"
            style={{ backgroundColor: colorHex }}
          />
        )}
      </div>

      {/* Inset Base Square with Diamond Pips & 2x2 Token Bases */}
      <div
        className={`w-[82%] aspect-square rounded-xl shadow-lg border flex items-center justify-center relative p-1 transition-all ${
          isDarkMode ? 'bg-[#121212] border-white/15 shadow-black/80' : 'bg-white border-black/10'
        }`}
        style={isCurrentTurn ? {
          boxShadow: `0 0 14px ${colorHex}88, inset 0 0 10px ${colorHex}33`
        } : undefined}
      >
        {/* Rotated Diamond Background */}
        <div
          className="w-[74%] aspect-square rounded-lg rotate-45 border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: colorHex,
            backgroundColor: isDarkMode ? `${colorHex}1a` : `${colorHex}25`,
            boxShadow: isCurrentTurn ? `0 0 14px ${colorHex}77` : (isDarkMode ? `0 0 10px ${colorHex}35` : 'none')
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
                    counterRotation={counterRotation}
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
        <div
          className="text-[9px] font-bold text-white/80 uppercase tracking-widest drop-shadow-sm select-none"
          style={counterRotation ? { transform: `rotate(${-counterRotation}deg)` } : undefined}
        >
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
  trackCoordMap, homeStretchMap, cellOccupants, safeTrackIndices, onSelectToken, theme, players, counterRotation = 0
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
            <span
              className={`text-[10px] md:text-xs font-black select-none ${theme.starColor}`}
              style={counterRotation ? { transform: `rotate(${-counterRotation}deg)` } : undefined}
            >★</span>
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
                    counterRotation={counterRotation}
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
  theme,
  moveTimer,
  diceProps,
  myPlayerIndex = null
}) {
  const baseOffset = (myPlayerIndex !== null && myPlayerIndex !== undefined && myPlayerIndex >= 0) ? myPlayerIndex : 0;

  return (
    <div className="w-full h-full relative flex items-center justify-center p-2">
      {/* Central Finish & Dice Hub */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-950 border-4 border-amber-400/90 shadow-2xl flex flex-col items-center justify-center z-20 p-1 relative overflow-hidden">
        {diceProps ? (
          <Dice
            value={diceProps.value}
            isRolling={diceProps.isRolling}
            disabled={diceProps.disabled}
            onRoll={diceProps.onRoll}
            playerColor={diceProps.playerColor}
            timerSeconds={diceProps.timerSeconds}
            isUrgent={diceProps.isUrgent}
            inCenter={true}
          />
        ) : (
          <>
            <span className="text-amber-400 text-xs font-black uppercase tracking-wider">BUDO</span>
            <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
              {finishOccupants.map((t, idx) => (
                <Token key={`rad_fin_${idx}`} color={t.color} size="sm" isHopping={t.isHopping} />
              ))}
              {finishOccupants.length === 0 && (
                <span className="text-amber-300 text-sm">🏆</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Radial Players Yards & Track Spokes */}
      {gameState.players.map((player, pIdx) => {
        const relativeIdx = (pIdx - baseOffset + playerCount) % playerCount;
        const angle = (relativeIdx * (360 / playerCount) + 90) * (Math.PI / 180);
        const radius = 37;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        const isCurrentTurn = gameState.currentTurnIndex === player.playerIndex;

        return (
          <div
            key={pIdx}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-all ${
              isCurrentTurn ? 'animate-yard-pulse z-30' : ''
            }`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              '--yard-glow-color': player.color.hex
            }}
          >
            <div 
              className="p-1.5 md:p-2 rounded-2xl bg-slate-950/90 border-2 shadow-xl flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20"
              style={{
                borderColor: player.color.hex,
                boxShadow: isCurrentTurn ? `0 0 20px ${player.color.hex}` : undefined
              }}
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

