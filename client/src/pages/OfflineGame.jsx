import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfflineLudoEngine } from '../game/offlineEngine';
import { getBotMove, getBestAutoMove } from '../game/bot';
import LudoBoard from '../components/LudoBoard';
import Dice from '../components/Dice';
import PlayerCard from '../components/PlayerCard';
import { BOARD_THEMES } from '../game/boardThemes';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Bot, Users, Palette, Clock, Check } from 'lucide-react';

export default function OfflineGame() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(4);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameMode, setGameMode] = useState('bot'); // 'bot' vs 'local_pass'
  const [engine, setEngine] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [themeName, setThemeName] = useState(localStorage.getItem('budo_board_theme') || 'classic');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  // Move Timer Feature (6-second countdown for move selection)
  const [moveTimerSeconds, setMoveTimerSeconds] = useState(6);
  const [moveTimerActive, setMoveTimerActive] = useState(false);
  const moveTimerIntervalRef = useRef(null);
  const moveTimerAutoMoveRef = useRef(null);

  // Roll Timer Feature (10-second countdown — auto-rolls if player doesn't tap)
  const [rollTimerSeconds, setRollTimerSeconds] = useState(10);
  const rollTimerIntervalRef = useRef(null);
  const autoRollInProgressRef = useRef(false);

  const handleSelectTheme = (tId) => {
    sound.playClick();
    setThemeName(tId);
    localStorage.setItem('budo_board_theme', tId);
    setShowThemeModal(false);
  };

  // Initialize Match
  const startOfflineMatch = () => {
    sound.playVictory();
    triggerHaptic('medium');

    const configs = [];
    // Player 1 is always human
    configs.push({
      userId: 1,
      username: 'You',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=user_hero',
      isBot: false
    });

    for (let i = 1; i < playerCount; i++) {
      configs.push({
        userId: -(i + 1),
        username: gameMode === 'bot' ? `Bot ${['Alpha', 'Shadow', 'Turbo', 'Ninja', 'Cosmo', 'Titan', 'Blaze'][i - 1] || i + 1}` : `Player ${i + 1}`,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=p_${i}`,
        isBot: gameMode === 'bot',
        botDifficulty: difficulty
      });
    }

    const eng = new OfflineLudoEngine(configs);
    setEngine(eng);
    setGameState(eng.getState());
    setGameStarted(true);
  };

  // Roll Dice (1.5s animation matching Dice.jsx)
  const handleRollDice = (isAutoRoll = false) => {
    if (!engine || diceRolling) return;
    const current = gameState.players[gameState.currentTurnIndex];
    if (!isAutoRoll && current.isBot) return;

    // Clear roll timer immediately
    if (rollTimerIntervalRef.current) clearInterval(rollTimerIntervalRef.current);
    autoRollInProgressRef.current = false;

    setDiceRolling(true);
    sound.playDiceRoll();
    triggerHaptic('light');

    setTimeout(() => {
      const rollRes = engine.rollDice();
      setDiceRolling(false);
      if (rollRes) {
        setGameState(rollRes.gameState);

        // If auto-roll and there are valid moves, auto-pick the best one
        if (isAutoRoll && rollRes.validTokens && rollRes.validTokens.length > 0) {
          setTimeout(() => {
            const bestToken = getBestAutoMove(rollRes.gameState, current.playerIndex, rollRes.diceValue);
            if (bestToken !== null) {
              handleSelectTokenDirect(rollRes.gameState, engine, bestToken);
            }
          }, 900);
        }
      }
    }, 1500);
  };

  // Select and Move Token (direct with explicit refs for auto-move)
  const handleSelectTokenDirect = (currentState, eng, tokenId) => {
    if (!eng) return;
    const moveRes = eng.moveToken(tokenId);
    if (moveRes) {
      setGameState(moveRes.gameState);
      if (moveRes.outcome?.captures?.length > 0) {
        sound.playCapture();
        triggerHaptic('heavy');
      } else {
        sound.playMove();
        triggerHaptic('light');
      }
      if (moveRes.gameOver) {
        sound.playVictory();
        triggerHaptic('victory');
        confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 } });
      }
    }
  };

  // Select and Move Token
  const handleSelectToken = (tokenId) => {
    // Cancel move timer immediately upon token selection
    if (moveTimerIntervalRef.current) clearInterval(moveTimerIntervalRef.current);
    if (moveTimerAutoMoveRef.current) clearTimeout(moveTimerAutoMoveRef.current);
    setMoveTimerActive(false);

    if (!engine) return;
    handleSelectTokenDirect(gameState, engine, tokenId);
  };

  // 10-Second Roll Timer — auto-rolls if human player doesn't tap the dice
  useEffect(() => {
    if (rollTimerIntervalRef.current) clearInterval(rollTimerIntervalRef.current);
    autoRollInProgressRef.current = false;

    if (!gameStarted || !gameState || gameState.phase !== 'WAITING_ROLL') {
      setRollTimerSeconds(10);
      return;
    }

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (!currentPlayer || currentPlayer.isBot) {
      setRollTimerSeconds(10);
      return;
    }

    const TOTAL = 10;
    setRollTimerSeconds(TOTAL);

    const startTime = Date.now();
    rollTimerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, TOTAL - elapsed);
      setRollTimerSeconds(remaining);

      if (remaining <= 0 && !autoRollInProgressRef.current) {
        clearInterval(rollTimerIntervalRef.current);
        autoRollInProgressRef.current = true;
        handleRollDice(true); // auto-roll with auto-move
      }
    }, 500);

    return () => {
      if (rollTimerIntervalRef.current) clearInterval(rollTimerIntervalRef.current);
    };
  }, [gameStarted, gameState?.currentTurnIndex, gameState?.phase]);

  // Move Countdown Timer (6s countdown for WAITING_MOVE with smart priority auto-move fallback)
  useEffect(() => {
    if (moveTimerIntervalRef.current) clearInterval(moveTimerIntervalRef.current);
    if (moveTimerAutoMoveRef.current) clearTimeout(moveTimerAutoMoveRef.current);

    if (!engine || !gameState || gameState.phase !== 'WAITING_MOVE') {
      setMoveTimerActive(false);
      return;
    }

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (!currentPlayer || currentPlayer.isBot) {
      setMoveTimerActive(false);
      return;
    }

    const validMoves = gameState.validMoves || [];
    if (validMoves.length === 0) {
      setMoveTimerActive(false);
      return;
    }

    const TOTAL_MOVE_SECONDS = 6;
    setMoveTimerSeconds(TOTAL_MOVE_SECONDS);
    setMoveTimerActive(true);

    const startTime = Date.now();
    moveTimerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, TOTAL_MOVE_SECONDS - elapsed);
      setMoveTimerSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(moveTimerIntervalRef.current);
        setMoveTimerActive(false);

        // Auto-pick coin with priority: capture opponent > reach home > furthest on path > first available
        const bestToken = getBestAutoMove(engine.getState(), currentPlayer.playerIndex, gameState.diceValue);
        if (bestToken !== null) {
          handleSelectToken(bestToken);
        }
      }
    }, 200);

    // If only 1 coin is movable, auto-move smoothly after 1.8s preview if player doesn't tap sooner
    if (validMoves.length === 1) {
      moveTimerAutoMoveRef.current = setTimeout(() => {
        handleSelectToken(validMoves[0]);
      }, 1800);
    }

    return () => {
      if (moveTimerIntervalRef.current) clearInterval(moveTimerIntervalRef.current);
      if (moveTimerAutoMoveRef.current) clearTimeout(moveTimerAutoMoveRef.current);
    };
  }, [engine, gameState?.phase, gameState?.currentTurnIndex, gameState?.diceValue]);

  // Bot Turn Automation Effect with visual 1.7s dice roll
  useEffect(() => {
    if (!engine || !gameState || gameState.phase === 'GAME_OVER') return;

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (currentPlayer && currentPlayer.isBot) {
      const timer1 = setTimeout(() => {
        if (gameState.phase === 'WAITING_ROLL') {
          setDiceRolling(true);
          sound.playDiceRoll();

          setTimeout(() => {
            const rollRes = engine.rollDice();
            setDiceRolling(false);
            if (rollRes) {
              setGameState(rollRes.gameState);

              if (rollRes.validTokens && rollRes.validTokens.length > 0) {
                const timer2 = setTimeout(() => {
                  const bestToken = getBotMove(
                    engine.getState(),
                    currentPlayer.playerIndex,
                    rollRes.diceValue,
                    currentPlayer.botDifficulty
                  );
                  if (bestToken !== null) {
                    const moveRes = engine.moveToken(bestToken);
                    if (moveRes) {
                      setGameState(moveRes.gameState);
                      if (moveRes.outcome?.captures?.length > 0) sound.playCapture();
                      else sound.playMove();
                      if (moveRes.gameOver) {
                        sound.playVictory();
                        confetti({ particleCount: 150, spread: 80 });
                      }
                    }
                  }
                }, 1000);
                return () => clearTimeout(timer2);
              }
            }
          }, 1300);
        }
      }, 700);
      return () => clearTimeout(timer1);
    }
  }, [engine, gameState]);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-budo-bg flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <button
            onClick={() => { sound.playClick(); navigate('/'); }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <div>
            <h2 className="text-xl font-black text-white">Offline Ludo</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Play offline without internet against smart computer bots or friends.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-300">Game Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { sound.playClick(); setGameMode('bot'); }}
                className={`py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                  gameMode === 'bot'
                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>vs Computer AI</span>
              </button>

              <button
                type="button"
                onClick={() => { sound.playClick(); setGameMode('local_pass'); }}
                className={`py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                  gameMode === 'local_pass'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Pass & Play</span>
              </button>
            </div>
          </div>

          {/* Player Count Selector (2, 3, 4, 6, 8) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-300">Players Count</label>
            <div className="grid grid-cols-5 gap-1.5">
              {[2, 3, 4, 6, 8].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { sound.playClick(); setPlayerCount(c); }}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    playerCount === c
                      ? 'bg-amber-500 border-amber-300 text-slate-950 font-black scale-105'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {c}P
                </button>
              ))}
            </div>
          </div>

          {/* AI Difficulty (if bot mode) */}
          {gameMode === 'bot' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-300">AI Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {['easy', 'medium', 'hard'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { sound.playClick(); setDifficulty(d); }}
                    className={`py-2 rounded-xl border text-xs font-bold uppercase transition-all ${
                      difficulty === d
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={startOfflineMatch}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-500/30 active:scale-95 transition-all"
          >
            Start Offline Match
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isHumanTurn = !currentPlayer?.isBot;
  const isWaitingRoll = gameState.phase === 'WAITING_ROLL';
  const isRollUrgent = rollTimerSeconds <= 3;

  return (
    <div className="h-[100dvh] bg-budo-bg flex flex-col items-center select-none overflow-hidden">
      {/* Header */}
      <header className="w-full max-w-md md:max-w-2xl px-3 py-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <button
          onClick={() => { sound.playClick(); setGameStarted(false); }}
          className="p-1.5 rounded-xl bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-purple-400">
            <span>Offline Match ({difficulty.toUpperCase()})</span>
          </div>
          <div className="text-xs font-black text-amber-400">
            {currentPlayer?.username}'s Turn
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Theme Switcher Button */}
          <button
            onClick={() => { sound.playClick(); setShowThemeModal(true); }}
            className="p-1.5 rounded-xl bg-slate-900 text-purple-400 hover:text-purple-300 border border-slate-800 active:scale-90 transition-transform"
            title="Choose Board Theme"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={startOfflineMatch}
            className="p-1.5 rounded-xl bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            title="Restart Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Board Arena */}
      <main className="w-full max-w-md md:max-w-2xl flex-1 flex flex-col items-center justify-between p-2 gap-1.5 min-h-0 overflow-hidden">
        {/* Dynamic Ludo Board with Theme & Step-by-Step Hop Animation */}
        <div className="w-full flex items-center justify-center flex-1 min-h-0">
          <LudoBoard
            gameState={gameState}
            onSelectToken={handleSelectToken}
            validTokens={isHumanTurn ? gameState.validMoves : []}
            themeName={themeName}
            moveTimer={{ seconds: moveTimerSeconds, total: 6, active: moveTimerActive }}
            myPlayerIndex={gameMode === 'local_pass' ? gameState.currentTurnIndex : 0}
          />
        </div>

        {/* User Perspective Control Bar (Left: Dice, Right: Turn Status & Guide) */}
        <div className="w-full max-w-md px-3 py-2 flex items-center justify-between gap-3 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl flex-shrink-0">
          {/* Left: Perspective Dice */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <Dice
              value={gameState.diceValue}
              isRolling={diceRolling}
              disabled={!isHumanTurn || !isWaitingRoll}
              onRoll={handleRollDice}
              playerColor={currentPlayer?.color.hex}
              timerSeconds={isHumanTurn && isWaitingRoll ? rollTimerSeconds : null}
              isUrgent={isRollUrgent}
            />
          </div>

          {/* Right: Turn Status & Move Action Guide */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: currentPlayer?.color?.hex }}
                />
                <span className="text-xs font-black text-white truncate">
                  {currentPlayer?.username}'s Turn
                </span>
              </div>
              {isWaitingRoll && isHumanTurn && (
                <span className="text-[10px] font-mono font-black text-purple-400 bg-purple-400/15 px-2 py-0.5 rounded-full border border-purple-400/40 animate-pulse">
                  ⏱️ {rollTimerSeconds}s
                </span>
              )}
              {gameState.phase === 'WAITING_MOVE' && isHumanTurn && (
                <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full border border-emerald-400/40 animate-pulse">
                  ⏱️ {moveTimerSeconds}s
                </span>
              )}
            </div>

            <div className="text-[11px] font-bold truncate">
              {isHumanTurn ? (
                isWaitingRoll ? (
                  <span className="text-purple-400 flex items-center gap-1 animate-pulse">
                    👈 Tap Dice to Roll!
                  </span>
                ) : gameState.phase === 'WAITING_MOVE' ? (
                  <span className="text-emerald-400">
                    🎯 Tap highlighted coin to move!
                  </span>
                ) : (
                  <span className="text-slate-400">Processing move...</span>
                )
              ) : (
                <span className="text-slate-400">
                  {currentPlayer?.username} is thinking...
                </span>
              )}
            </div>

            {moveTimerActive && isHumanTurn && (
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-200"
                  style={{ width: `${(moveTimerSeconds / 6) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Board Theme Chooser Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-400" />
                <span>Choose Board Theme</span>
              </h3>
              <button
                onClick={() => setShowThemeModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {Object.values(BOARD_THEMES).map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id)}
                  className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all active:scale-95 ${
                    themeName === t.id
                      ? 'bg-purple-600/30 border-purple-400 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{t.icon}</span>
                    <div className="text-left">
                      <div className="text-xs font-bold">{t.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.centerWedges.red }}></span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.centerWedges.green }}></span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.centerWedges.yellow }}></span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.centerWedges.blue }}></span>
                      </div>
                    </div>
                  </div>
                  {themeName === t.id && <Check className="w-4 h-4 text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
