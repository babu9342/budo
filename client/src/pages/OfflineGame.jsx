import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfflineLudoEngine } from '../game/offlineEngine';
import { getBotMove } from '../game/bot';
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

  const autoMoveTimerRef = useRef(null);

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

  // Roll Dice (1.7s animation matching Dice.jsx)
  const handleRollDice = () => {
    if (!engine || diceRolling) return;
    const current = gameState.players[gameState.currentTurnIndex];
    if (current.isBot) return;

    setDiceRolling(true);
    sound.playDiceRoll();
    triggerHaptic('light');

    setTimeout(() => {
      const rollRes = engine.rollDice();
      setDiceRolling(false);
      if (rollRes) {
        setGameState(rollRes.gameState);
      }
    }, 1300);
  };

  // Select and Move Token
  const handleSelectToken = (tokenId) => {
    if (autoMoveTimerRef.current) clearTimeout(autoMoveTimerRef.current);
    if (!engine) return;

    const moveRes = engine.moveToken(tokenId);
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

  // 60s Turn Timer for Offline Game
  useEffect(() => {
    if (!gameStarted || !gameState || gameState.phase === 'GAME_OVER') return;

    const timeoutLimit = 60;
    const startTime = gameState.turnStartTime || Date.now();

    const calculateRemaining = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return Math.max(0, timeoutLimit - elapsed);
    };

    setRemainingSeconds(calculateRemaining());

    const timerInterval = setInterval(() => {
      const rem = calculateRemaining();
      setRemainingSeconds(rem);

      const currentPlayer = gameState.players[gameState.currentTurnIndex];
      const isHumanTurn = !currentPlayer?.isBot;

      if (rem <= 0 && isHumanTurn) {
        clearInterval(timerInterval);
        if (gameState.phase === 'WAITING_ROLL') {
          handleRollDice();
        } else if (gameState.phase === 'WAITING_MOVE' && gameState.validMoves?.length > 0) {
          handleSelectToken(gameState.validMoves[0]);
        }
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameStarted, gameState?.currentTurnIndex, gameState?.turnStartTime, gameState?.phase, gameState?.validMoves]);

  // Single Coin Auto-Move Effect for Human Players (giving 1.2s to see roll and indicator)
  useEffect(() => {
    if (!engine || !gameState || gameState.phase !== 'WAITING_MOVE') return;

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    const isHumanTurn = !currentPlayer?.isBot;

    if (isHumanTurn && gameState.validMoves?.length === 1) {
      autoMoveTimerRef.current = setTimeout(() => {
        handleSelectToken(gameState.validMoves[0]);
      }, 1200);

      return () => {
        if (autoMoveTimerRef.current) clearTimeout(autoMoveTimerRef.current);
      };
    }
  }, [engine, gameState?.phase, gameState?.currentTurnIndex, gameState?.validMoves]);

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
  const isUrgent = remainingSeconds <= 10;

  return (
    <div className="min-h-screen bg-budo-bg flex flex-col items-center select-none overflow-x-hidden">
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
            <span>•</span>
            <span className={`inline-flex items-center gap-0.5 font-mono font-black ${isUrgent ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
              <Clock className="w-3 h-3" />
              {remainingSeconds}s
            </span>
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
      <main className="w-full max-w-md md:max-w-2xl flex-1 flex flex-col items-center justify-start p-2 gap-2">
        {/* Opponents Strip */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {gameState.players.map((p, idx) => (
            <PlayerCard
              key={idx}
              player={p}
              isCurrentTurn={gameState.currentTurnIndex === idx}
              isWinner={gameState.winner?.userId === p.userId}
              compact={true}
              remainingSeconds={remainingSeconds}
            />
          ))}
        </div>

        {/* Quick In-Game Board Theme Switcher */}
        <div className="w-full flex items-center justify-between gap-1 bg-slate-950/60 border border-slate-800/80 rounded-2xl px-2.5 py-1.5 backdrop-blur-sm overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            <span>Theme:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {Object.values(BOARD_THEMES).map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTheme(t.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-90 ${
                  themeName === t.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 ring-1 ring-purple-300'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Turn Controls & 3D Rolling Dice - Attached snug directly above board */}
        <div className="w-full bg-slate-900/95 border border-slate-800/90 rounded-2xl p-2.5 flex items-center justify-between shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={currentPlayer?.avatarUrl}
                alt="Player"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 object-cover bg-slate-800 shadow-md"
                style={{ borderColor: currentPlayer?.color.hex }}
              />
              <span
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-slate-900 shadow-sm"
                style={{ backgroundColor: currentPlayer?.color.hex }}
              ></span>
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>{currentPlayer?.username}</span>
                {isHumanTurn && (
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 animate-pulse">
                    YOU
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {isWaitingRoll && (isHumanTurn ? '👉 Tap 3D Dice to roll' : '🤖 Bot thinking...')}
                {gameState.phase === 'WAITING_MOVE' && (isHumanTurn ? (gameState.validMoves?.length === 1 ? '⚡ Auto-moving coin...' : '✨ Choose glowing coin') : '🤖 Bot moving...')}
              </div>
            </div>
          </div>

          <Dice
            value={gameState.diceValue}
            isRolling={diceRolling}
            disabled={!isHumanTurn || !isWaitingRoll}
            onRoll={handleRollDice}
            playerColor={currentPlayer?.color.hex}
          />
        </div>

        {/* Dynamic Ludo Board with Theme & Step-by-Step Hop Animation */}
        <div className="w-full flex items-center justify-center">
          <LudoBoard
            gameState={gameState}
            onSelectToken={handleSelectToken}
            validTokens={isHumanTurn ? gameState.validMoves : []}
            themeName={themeName}
          />
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
