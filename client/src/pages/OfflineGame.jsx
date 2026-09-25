import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfflineLudoEngine } from '../game/offlineEngine';
import { getBotMove, getBestAutoMove } from '../game/bot';
import LudoBoard from '../components/LudoBoard';
import Dice from '../components/Dice';
import PlayerCard from '../components/PlayerCard';
import StickerPickerModal from '../components/StickerPickerModal';
import { BOARD_THEMES } from '../game/boardThemes';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { ArrowLeft, RotateCcw, Bot, Users, Palette, Clock, Check, Smile, Crown } from 'lucide-react';

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
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [floatingStickers, setFloatingStickers] = useState([]);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [winBanner, setWinBanner] = useState(null);

  const reactionTimerRef = useRef(null);
  const reactionFadeTimerRef = useRef(null);

  // Trigger floating reaction on the board (single active, instant replacement)
  const triggerSticker = (content, playerIndex = 0, isText = false) => {
    if (!gameState) return;
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    if (reactionFadeTimerRef.current) clearTimeout(reactionFadeTimerRef.current);

    const player = gameState.players[playerIndex] || gameState.players[0];
    const stickerId = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const newReaction = {
      id: stickerId,
      content,
      type: isText ? 'text' : 'sticker',
      username: player?.username || 'Player',
      avatarUrl: player?.avatarUrl || '/avatars/default.png',
      color: player?.color?.hex || '#F59E0B',
      playerIndex: player?.playerIndex !== undefined ? player.playerIndex : playerIndex,
      timestamp: Date.now(),
      isLeaving: false
    };

    setFloatingStickers([newReaction]);
    sound.playClick();
    triggerHaptic('light');

    reactionFadeTimerRef.current = setTimeout(() => {
      setFloatingStickers((prev) =>
        prev.map((s) => (s.id === stickerId ? { ...s, isLeaving: true } : s))
      );
    }, 2400);

    reactionTimerRef.current = setTimeout(() => {
      setFloatingStickers([]);
    }, 2850);
  };

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

    console.log('[Offline Lobby Creation] Selected mode:', gameMode, 'Player count:', playerCount, 'Configs:', configs.map(c => ({ id: c.userId, username: c.username, isBot: c.isBot })));

    const eng = new OfflineLudoEngine(configs);
    setEngine(eng);
    setGameState(eng.getState());
    setGameStarted(true);
  };

  // Roll Dice (1.6s animation matching Dice.jsx)
  const handleRollDice = (isAutoRoll = false) => {
    if (!engine || diceRolling) return;
    const current = engine.players[engine.currentTurnIndex];
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

        if (rollRes.autoPass || rollRes.consecutiveSixesSkipped) {
          // 2-second pause to let players see the rolled dice value before turn switches
          setTimeout(() => {
            const nextState = engine.advanceTurn();
            setGameState(nextState);
          }, 2000);
        } else if (isAutoRoll && rollRes.validTokens && rollRes.validTokens.length > 0) {
          // If auto-roll and there are valid moves, auto-pick after viewing
          setTimeout(() => {
            const activePlayer = engine.players[engine.currentTurnIndex];
            const bestToken = getBestAutoMove(rollRes.gameState, activePlayer.playerIndex, rollRes.diceValue);
            if (bestToken !== null) {
              console.log(`[OfflineGame Auto-Move] Applying coin move to currentPlayer: ${activePlayer.username} (index: ${activePlayer.playerIndex}, id: ${activePlayer.userId}), moving tokenId: ${bestToken}`);
              handleSelectTokenDirect(rollRes.gameState, engine, bestToken);
            }
          }, 800);
        }
      }
    }, 1600);
  };

  // Select and Move Token (direct with explicit refs for auto-move)
  const handleSelectTokenDirect = (currentState, eng, tokenId) => {
    if (!eng) return;
    const currentTurn = eng.currentTurnIndex;
    const currentPlayer = eng.players[currentTurn];
    console.log(`[OfflineGame Coin Move] Current Player: ${currentPlayer?.username} (index: ${currentTurn}, id: ${currentPlayer?.userId}) -> applying move on tokenId: ${tokenId}`);
    
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
        const winPlayer = moveRes.gameState?.winner || moveRes.gameState?.players?.find(p => p.finishedCount >= 4);
        const isWinnerMe = winPlayer?.isHuman || winPlayer?.username === 'You';
        const winnerName = winPlayer?.username || 'Player';
        setWinBanner({ isMe: isWinnerMe, winnerName });
        sound.playVictory();
        triggerHaptic('victory');
        confetti({
          particleCount: 220,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#EC4899', '#F43F5E', '#F59E0B', '#FDE047', '#A855F7', '#3B82F6']
        });
      } else if (moveRes.requiresTurnSwitch) {
        // 2-second delay after coin move animation completes before switching to next player's turn
        setTimeout(() => {
          const nextState = eng.advanceTurn();
          setGameState(nextState);
        }, 2000);
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

  // 10-Second Roll Timer — starts automatically on turn change and auto-rolls if human player doesn't tap dice
  useEffect(() => {
    if (rollTimerIntervalRef.current) clearInterval(rollTimerIntervalRef.current);
    autoRollInProgressRef.current = false;

    if (!gameStarted || !gameState || gameState.phase !== 'WAITING_ROLL') {
      setRollTimerSeconds(10);
      return;
    }

    const currentPlayer = gameState.players?.[gameState.currentTurnIndex];
    if (!currentPlayer || currentPlayer.isBot) {
      setRollTimerSeconds(10);
      return;
    }

    console.log(`Timer started for player ${currentPlayer.username}`);

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
        console.log(`Timer expired - auto rolling for player ${currentPlayer.username}`);
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
      setMoveTimerSeconds(6);
      return;
    }

    const currentPlayer = gameState.players?.[gameState.currentTurnIndex];
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

    return () => {
      if (moveTimerIntervalRef.current) clearInterval(moveTimerIntervalRef.current);
      if (moveTimerAutoMoveRef.current) clearTimeout(moveTimerAutoMoveRef.current);
    };
  }, [engine, gameState?.phase, gameState?.currentTurnIndex, gameState?.diceValue, gameState?.validMoves?.length]);

  // Bot Turn Automation Effect with visual 1.6s dice roll and 2-second turn switch delay
  useEffect(() => {
    if (!engine || !gameState || gameState.phase === 'GAME_OVER') return;

    const currentTurn = engine.currentTurnIndex;
    const currentPlayer = engine.players[currentTurn];
    if (currentPlayer && currentPlayer.isBot) {
      const timer1 = setTimeout(() => {
        if (engine.phase === 'WAITING_ROLL' && engine.currentTurnIndex === currentTurn) {
          setDiceRolling(true);
          sound.playDiceRoll();

          setTimeout(() => {
            if (engine.currentTurnIndex !== currentTurn) {
              setDiceRolling(false);
              return;
            }
            const rollRes = engine.rollDice();
            setDiceRolling(false);
            if (rollRes) {
              setGameState(rollRes.gameState);

              if (rollRes.autoPass || rollRes.consecutiveSixesSkipped) {
                // 2-second pause to let players see the rolled dice value before turn switches
                setTimeout(() => {
                  const nextState = engine.advanceTurn();
                  setGameState(nextState);
                }, 2000);
              } else if (rollRes.validTokens && rollRes.validTokens.length > 0) {
                const timer2 = setTimeout(() => {
                  if (engine.currentTurnIndex !== currentTurn) return;
                  const activeBot = engine.players[engine.currentTurnIndex];
                  const bestToken = getBotMove(
                    engine.getState(),
                    activeBot.playerIndex,
                    rollRes.diceValue,
                    activeBot.botDifficulty
                  );
                  if (bestToken !== null) {
                    console.log(`[OfflineGame Bot Move] Current Player: ${activeBot.username} (index: ${activeBot.playerIndex}, id: ${activeBot.userId}) -> applying move on tokenId: ${bestToken}`);
                    const moveRes = engine.moveToken(bestToken);
                    if (moveRes) {
                      setGameState(moveRes.gameState);
                      if (moveRes.outcome?.captures?.length > 0) sound.playCapture();
                      else sound.playMove();
                      if (moveRes.gameOver) {
                        const winPlayer = moveRes.gameState?.winner || moveRes.gameState?.players?.find(p => p.finishedCount >= 4);
                        const isWinnerMe = winPlayer?.isHuman || winPlayer?.username === 'You';
                        const winnerName = winPlayer?.username || 'Player';
                        setWinBanner({ isMe: isWinnerMe, winnerName });
                        sound.playVictory();
                        triggerHaptic('victory');
                        confetti({
                          particleCount: 220,
                          spread: 100,
                          origin: { y: 0.5 },
                          colors: ['#EC4899', '#F43F5E', '#F59E0B', '#FDE047', '#A855F7', '#3B82F6']
                        });
                      } else if (moveRes.requiresTurnSwitch) {
                        // 2-second delay after coin move finishes before next turn begins
                        setTimeout(() => {
                          const nextState = engine.advanceTurn();
                          setGameState(nextState);
                        }, 2000);
                      }
                    }
                  }
                }, 800);
                return () => clearTimeout(timer2);
              }
            }
          }, 1600);
        }
      }, 700);
      return () => clearTimeout(timer1);
    }
  }, [engine, gameState?.currentTurnIndex, gameState?.phase]);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-budo-bg flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <button
            onClick={() => {
              sound.playClick();
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/home');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
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
    <div className="h-[100dvh] max-h-[100dvh] bg-budo-bg flex flex-col items-center select-none overflow-hidden justify-between">
      {/* Header */}
      <header className="w-full max-w-md md:max-w-2xl px-3 py-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex-shrink-0">
        <button
          onClick={() => { sound.playClick(); setGameStarted(false); }}
          className="p-1.5 rounded-xl bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-purple-400">
            <span>🎲 Offline Match ({difficulty.toUpperCase()})</span>
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

      {/* Main Board Arena with Embedded Center Dice, Constant Left/Right Emoji & Reactions Controls */}
      <main className="w-full max-w-md md:max-w-2xl flex-1 flex flex-col items-center justify-center p-1 md:p-2 min-h-0 overflow-hidden relative">
        <div className="relative w-full h-full flex items-center justify-center min-h-0">

          {/* TOP HORIZONTAL ABSOLUTE OVERLAY: Quick 3D Animated Stickers & Launcher (Top Edge of Board) */}
          <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-2xl border border-slate-800/90 shadow-2xl pointer-events-auto max-w-[95%]">
            <button
              onClick={() => { sound.playClick(); setShowStickerPicker(true); }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 active:scale-90 transition-transform flex-shrink-0"
              title="All 3D Animated Stickers & Emojis"
            >
              <Smile className="w-4 h-4 text-slate-950" />
            </button>
            <div className="w-px h-4 bg-slate-800/80 flex-shrink-0" />
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { img: '/emojis/emoji-1.png', name: 'Grin Laugh 😆' },
                { img: '/emojis/emoji-2.png', name: 'Angry Rage 😡' },
                { img: '/emojis/emoji-3.png', name: 'Bored Roll 🙄' },
                { img: '/emojis/emoji-4.png', name: 'Crying Tears 😭' },
                { img: '/emojis/emoji-5.png', name: 'Nervous Teeth 😬' },
                { img: '/emojis/emoji-6.png', name: 'Sweat Wipe 😰' },
                { img: '/emojis/emoji-7.png', name: 'Yawn Sleepy 🥱' },
                { img: '/emojis/emoji-8.png', name: 'Wink Tongue 😜' },
                { img: '/emojis/emoji-9.png', name: 'Budo King 👑' },
                { img: '/emojis/emoji-10.png', name: 'Cool Dice 😎' },
                { img: '/emojis/emoji-11.png', name: 'Heart Eyes 😍' },
                { img: '/emojis/emoji-12.png', name: 'Puddle Cry 😢' },
                { img: '/stickers/rose_love.png', name: 'Rose Love 🌹' },
                { img: '/stickers/flex_beard.png', name: 'Flex Power 💪' },
                { img: '/stickers/king_crown.png', name: 'King Crown 👑' },
                { img: '/stickers/hurry_watch.png', name: 'Hurry Up! ⏱️' }
              ].map((stk) => (
                <button
                  key={stk.img}
                  onClick={() => {
                    sound.playClick();
                    triggerSticker(stk.img, 0);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 p-0.5 flex items-center justify-center active:scale-90 transition-all border border-slate-800/70 group flex-shrink-0"
                  title={stk.name}
                >
                  <img
                    src={stk.img}
                    alt={stk.name}
                    loading="lazy"
                    className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-125 transition-transform"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Ludo Board with Center Dice & Step-by-Step Hop Animation */}
          <div className="w-full h-full flex items-center justify-center min-h-0">
            <LudoBoard
              gameState={gameState}
              onSelectToken={handleSelectToken}
              validTokens={isHumanTurn && gameState.phase === 'WAITING_MOVE' ? (gameState.validMoves || []) : []}
              themeName={themeName}
              moveTimer={{ seconds: moveTimerSeconds, total: 6, active: moveTimerActive }}
              myPlayerIndex={gameMode === 'local_pass' ? gameState.currentTurnIndex : 0}
              stickers={floatingStickers}
              diceProps={{
                value: gameState.diceValue,
                isRolling: diceRolling,
                disabled: !isHumanTurn || !isWaitingRoll,
                onRoll: handleRollDice,
                playerColor: currentPlayer?.color?.hex,
                timerSeconds: isWaitingRoll ? rollTimerSeconds : null,
                isUrgent: isRollUrgent
              }}
            />
          </div>

          {/* BOTTOM HORIZONTAL ABSOLUTE OVERLAY: Quick Battle Phrases (Bottom Edge of Board) */}
          <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-2xl border border-slate-800/90 shadow-2xl pointer-events-auto max-w-[95%]">
            <button
              onClick={() => {
                sound.playClick();
                handleBroadcastSticker('GG! 👑');
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/20 active:scale-90 transition-transform flex-shrink-0"
              title="GG!"
            >
              👑
            </button>
            <div className="w-px h-4 bg-slate-800/80 flex-shrink-0" />
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: '👑 GG!', text: 'GG! 👑' },
                { label: '🎯 Nice', text: 'Nice Move! 🎯' },
                { label: '😅 Oops', text: 'Oops! 😅' },
                { label: '👋 Bye', text: 'Bye Bye! 👋' }
              ].map((msg) => (
                <button
                  key={msg.label}
                  onClick={() => {
                    sound.playClick();
                    handleBroadcastSticker(msg.text);
                  }}
                  className="px-2 py-0.5 sm:py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-[9px] sm:text-[10px] font-black text-slate-200 border border-slate-800/70 active:scale-90 transition-transform whitespace-nowrap flex-shrink-0"
                  title={`Send "${msg.text}"`}
                >
                  {msg.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Ultra-Compact Turn Status Ribbon */}
      <div className="w-full max-w-md md:max-w-2xl px-3 py-1.5 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-between gap-2 flex-shrink-0 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
            style={{ backgroundColor: currentPlayer?.color?.hex }}
          />
          <span className="font-bold text-white truncate">
            {isHumanTurn ? (
              isWaitingRoll ? (
                <span className="text-amber-400 animate-pulse">🎲 Tap center dice to roll!</span>
              ) : gameState.phase === 'WAITING_MOVE' ? (
                <span className="text-emerald-400">🎯 Tap highlighted coin to move!</span>
              ) : (
                <span className="text-slate-400">Processing move...</span>
              )
            ) : (
              <span className="text-purple-300 animate-pulse">🤖 {currentPlayer?.username} is calculating move...</span>
            )}
          </span>
        </div>

        {isHumanTurn && (
          <div className="flex items-center gap-1">
            {isWaitingRoll && (
              <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
                ⏱️ {rollTimerSeconds}s
              </span>
            )}
            {gameState.phase === 'WAITING_MOVE' && (
              <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full border border-emerald-400/40 animate-pulse">
                ⏱️ {moveTimerSeconds}s
              </span>
            )}
          </div>
        )}
      </div>

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

      {/* Animated Sticker Reaction Picker Modal */}
      <StickerPickerModal
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={(stk) => triggerSticker(stk, 0)}
      />

      {/* Immediate Victory Celebration Banner Modal */}
      {winBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in pointer-events-auto">
          <div className="relative bg-gradient-to-b from-slate-900 via-[#1e102d] to-slate-950 border-2 border-pink-500/70 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-[0_0_60px_rgba(236,72,153,0.6)] animate-scale-up space-y-5">
            
            {/* Crown with Floating Hearts */}
            <div className="relative flex items-center justify-center">
              <span className="text-3xl sm:text-4xl animate-bounce">💖</span>
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 p-1 shadow-2xl shadow-pink-500/50 flex items-center justify-center mx-2.5 animate-pulse">
                <Crown className="w-10 h-10 text-white fill-white" />
              </div>
              <span className="text-3xl sm:text-4xl animate-bounce" style={{ animationDelay: '200ms' }}>💖</span>
            </div>

            {/* Victory Headline */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 drop-shadow-lg">
                {winBanner.isMe ? '💖 YOU WON OUR HEARTS! 💖' : `${winBanner.winnerName} Won Our Hearts! 💖`}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-pink-200/90 flex items-center justify-center gap-1.5 pt-0.5">
                <span>👑</span>
                <span>{winBanner.isMe ? 'Champion of the Match!' : 'Legendary Victory!'}</span>
                <span>✨</span>
              </p>
            </div>

            {/* Celebration Emojis Stream */}
            <div className="flex items-center justify-center gap-2.5 text-2xl animate-pulse pt-1">
              <span>🥰</span>
              <span>❤️</span>
              <span>✨</span>
              <span>🏆</span>
              <span>🎉</span>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setWinBanner(null);
                  startOfflineMatch();
                }}
                className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>

              <button
                onClick={() => {
                  setWinBanner(null);
                  setGameStarted(false);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 active:scale-95 transition-all"
              >
                Match Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
