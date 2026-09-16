import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfflineLudoEngine } from '../game/offlineEngine';
import { getBotMove } from '../game/bot';
import LudoBoard from '../components/LudoBoard';
import Dice from '../components/Dice';
import PlayerCard from '../components/PlayerCard';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Bot, Users } from 'lucide-react';

export default function OfflineGame() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(4);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameMode, setGameMode] = useState('bot'); // 'bot' vs 'local_pass'
  const [engine, setEngine] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

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
        username: gameMode === 'bot' ? `Bot ${['Alpha', 'Shadow', 'Turbo', 'Ninja', 'Cosmo', 'Titan', 'Blaze'][i - 1]}` : `Player ${i + 1}`,
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

  // Roll Dice
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
    }, 450);
  };

  // Select and Move Token
  const handleSelectToken = (tokenId) => {
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

  // Bot Turn Automation Effect
  useEffect(() => {
    if (!engine || !gameState || gameState.phase === 'GAME_OVER') return;

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (currentPlayer && currentPlayer.isBot) {
      const timer1 = setTimeout(() => {
        if (gameState.phase === 'WAITING_ROLL') {
          const rollRes = engine.rollDice();
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
              }, 700);
              return () => clearTimeout(timer2);
            }
          }
        }
      }, 750);
      return () => clearTimeout(timer1);
    }
  }, [engine, gameState]);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-budo-bg flex flex-col items-center justify-center p-4">
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
                className={`py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 ${
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
                className={`py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 ${
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

          {/* Player Count */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-300">Players Count</label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 4, 6, 8].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { sound.playClick(); setPlayerCount(c); }}
                  className={`py-2.5 rounded-xl border text-xs font-bold ${
                    playerCount === c
                      ? 'bg-amber-500 border-amber-300 text-slate-950 font-black'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {c} Players
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
                    className={`py-2 rounded-xl border text-xs font-bold uppercase ${
                      difficulty === d
                        ? 'bg-emerald-600 border-emerald-400 text-white'
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

  return (
    <div className="min-h-screen bg-budo-bg flex flex-col items-center select-none overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-md md:max-w-2xl px-3 py-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <button
          onClick={() => { sound.playClick(); setGameStarted(false); }}
          className="p-1.5 rounded-xl bg-slate-900 text-slate-400 border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="text-[10px] uppercase font-bold tracking-widest text-purple-400">
            Offline Match ({difficulty.toUpperCase()})
          </div>
          <div className="text-xs font-black text-amber-400">
            {currentPlayer?.username}'s Turn
          </div>
        </div>

        <button
          onClick={startOfflineMatch}
          className="p-1.5 rounded-xl bg-slate-900 text-slate-400 border border-slate-800"
          title="Restart Game"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </header>

      {/* Main Board */}
      <main className="w-full max-w-md md:max-w-2xl flex-1 flex flex-col items-center justify-between p-2">
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 my-1">
          {gameState.players.map((p, idx) => (
            <PlayerCard
              key={idx}
              player={p}
              isCurrentTurn={gameState.currentTurnIndex === idx}
              isWinner={gameState.winner?.userId === p.userId}
              compact={true}
            />
          ))}
        </div>

        <div className="w-full flex items-center justify-center my-auto">
          <LudoBoard
            gameState={gameState}
            onSelectToken={handleSelectToken}
            validTokens={isHumanTurn ? gameState.validMoves : []}
          />
        </div>

        {/* Turn Controls */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-3 flex items-center justify-between shadow-2xl backdrop-blur-md mt-2">
          <div className="flex items-center gap-3">
            <img
              src={currentPlayer?.avatarUrl}
              alt="Player"
              className="w-12 h-12 rounded-2xl border-2 object-cover bg-slate-800"
              style={{ borderColor: currentPlayer?.color.hex }}
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{currentPlayer?.username}</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentPlayer?.color.hex }}
                ></span>
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {isWaitingRoll && (isHumanTurn ? 'Tap dice to roll' : 'Bot thinking...')}
                {gameState.phase === 'WAITING_MOVE' && (isHumanTurn ? 'Choose token' : 'Bot moving...')}
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
      </main>
    </div>
  );
}
