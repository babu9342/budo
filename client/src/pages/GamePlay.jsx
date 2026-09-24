import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { socketService } from '../services/socket';
import { setGameState, setDiceRolling, setValidTokens } from '../store/gameSlice';
import { toggleSound } from '../store/settingsSlice';
import LudoBoard from '../components/LudoBoard';
import Dice from '../components/Dice';
import PlayerCard from '../components/PlayerCard';
import ChatDrawer from '../components/ChatDrawer';
import StickerPickerModal from '../components/StickerPickerModal';
import { BOARD_THEMES } from '../game/boardThemes';
import { getBestAutoMove } from '../game/bot';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { ArrowLeft, MessageSquare, Palette, Clock, Check, Volume2, VolumeX, RotateCcw, Smile } from 'lucide-react';

export default function GamePlay() {
  const { code } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const socket = socketService.getSocket();

  const { user } = useSelector((state) => state.auth);
  const { gameState, diceRolling } = useSelector((state) => state.game);
  const { sound: isSoundEnabled } = useSelector((state) => state.settings);

  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [messages, setMessages] = useState([]);
  const [themeName, setThemeName] = useState(localStorage.getItem('budo_board_theme') || 'classic');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [floatingStickers, setFloatingStickers] = useState([]);
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  // Move Timer Feature (6-second countdown for move selection)
  const [moveTimerSeconds, setMoveTimerSeconds] = useState(6);
  const [moveTimerActive, setMoveTimerActive] = useState(false);
  const moveTimerIntervalRef = useRef(null);
  const moveTimerAutoMoveRef = useRef(null);

  // Roll Timer Feature (10-second countdown — auto-rolls if my-turn player doesn't tap)
  const [rollTimerSeconds, setRollTimerSeconds] = useState(10);
  const rollTimerIntervalRef = useRef(null);
  const autoRollInProgressRef = useRef(false);

  const autoMoveTimerRef = useRef(null);

  const reactionTimerRef = useRef(null);
  const reactionFadeTimerRef = useRef(null);

  const displayFloatingReaction = (msg, isText = false) => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    if (reactionFadeTimerRef.current) clearTimeout(reactionFadeTimerRef.current);

    const sender = gameState?.players?.find(p => p.userId === msg.userId || p.username === msg.username);
    const stickerId = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const newReaction = {
      id: stickerId,
      content: msg.content || msg.message,
      type: isText ? 'text' : 'sticker',
      username: msg.username || sender?.username || user?.username || 'Player',
      avatarUrl: sender?.avatarUrl || user?.avatar_url || '/avatars/default.png',
      color: sender?.color?.hex || '#F59E0B',
      playerIndex: sender?.playerIndex !== undefined ? sender.playerIndex : (gameState?.players?.findIndex(p => p.userId === msg.userId) ?? -1),
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

  // Change and persist board theme
  const handleSelectTheme = (tId) => {
    sound.playClick();
    setThemeName(tId);
    localStorage.setItem('budo_board_theme', tId);
    setShowThemeModal(false);
  };

  const validTokens = gameState?.validMoves || [];

  useEffect(() => {
    if (!socket) return;

    // Request current game state and ensure socket is in the room channel
    if (!gameState) {
      socket.emit('room:join', {
        roomCode: code,
        roomId: code,
        user: user || { id: -999, username: 'Player' }
      });
      socket.emit('game:getState', { roomId: code });
    }

    // Listen to game state sync / reconnect
    const handleGameState = (data) => {
      if (data?.game) {
        dispatch(setGameState(data.game));
      } else if (data?.gameState) {
        dispatch(setGameState(data.gameState));
      }
    };
    socket.on('game:state', handleGameState);

    // Listen to dice result
    socket.on('dice:result', (data) => {
      dispatch(setDiceRolling(false));
      dispatch(setGameState(data.gameState));
      sound.playDiceRoll();
      triggerHaptic('medium');
    });

    // Listen to token update
    socket.on('token:update', (data) => {
      dispatch(setGameState(data.gameState));
      
      if (data.outcome?.captures?.length > 0) {
        sound.playCapture();
        triggerHaptic('heavy');
      } else {
        sound.playMove();
        triggerHaptic('light');
      }

      if (data.gameOver) {
        sound.playVictory();
        triggerHaptic('victory');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        setTimeout(() => {
          navigate('/result');
        }, 2200);
      }
    });

    // Listen to game finish
    socket.on('game:finish', (data) => {
      dispatch(setGameState(data.gameState));
      sound.playVictory();
      triggerHaptic('victory');
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } });
      setTimeout(() => {
        navigate('/result');
      }, 2200);
    });

    // Chat listeners
    socket.on('chat:message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen) setUnreadChat((prev) => prev + 1);
      displayFloatingReaction(msg, true);
    });

    socket.on('chat:sticker', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen) setUnreadChat((prev) => prev + 1);
      displayFloatingReaction(msg, false);
    });

    socket.on('chat:audio', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen) setUnreadChat((prev) => prev + 1);
    });

    return () => {
      socket.off('game:state', handleGameState);
      socket.off('dice:result');
      socket.off('token:update');
      socket.off('game:finish');
      socket.off('chat:message');
      socket.off('chat:sticker');
      socket.off('chat:audio');
    };
  }, [code, gameState, chatOpen, dispatch, navigate, socket, user]);

  // 60-Second (1 Minute) Live Turn Timer — fallback for WAITING_MOVE only
  useEffect(() => {
    if (!gameState || gameState.phase === 'GAME_OVER') return;

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
      const isMyTurnNow = currentPlayer?.userId === user?.id;

      if (rem <= 0 && isMyTurnNow && gameState.phase === 'WAITING_MOVE' && validTokens.length > 0) {
        clearInterval(timerInterval);
        const best = getBestAutoMove(gameState, currentPlayer.playerIndex, gameState.diceValue);
        if (best !== null) handleSelectToken(best);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameState?.currentTurnIndex, gameState?.turnStartTime, gameState?.phase, validTokens, user?.id]);

  // 10-Second Roll Timer — auto-rolls if my-turn player doesn't tap the dice
  useEffect(() => {
    if (rollTimerIntervalRef.current) clearInterval(rollTimerIntervalRef.current);
    autoRollInProgressRef.current = false;

    if (!gameState || gameState.phase !== 'WAITING_ROLL') {
      setRollTimerSeconds(10);
      return;
    }

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    const isMyTurnNow = currentPlayer?.userId === user?.id;
    if (!isMyTurnNow) {
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
        // Auto-emit roll via socket (same as manual roll)
        if (!diceRolling) {
          dispatch(setDiceRolling(true));
          socket.emit('dice:roll', { roomId: gameState.roomId || code });
        }
      }
    }, 500);

    return () => {
      if (rollTimerIntervalRef.current) clearInterval(rollTimerIntervalRef.current);
    };
  }, [gameState?.currentTurnIndex, gameState?.phase, user?.id]);

  // Move Countdown Timer (6s countdown with smart priority auto-move fallback)
  useEffect(() => {
    if (moveTimerIntervalRef.current) clearInterval(moveTimerIntervalRef.current);
    if (moveTimerAutoMoveRef.current) clearTimeout(moveTimerAutoMoveRef.current);

    if (!gameState || gameState.phase !== 'WAITING_MOVE') {
      setMoveTimerActive(false);
      return;
    }

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    const isMyTurn = currentPlayer?.userId === user?.id;

    if (!isMyTurn || validTokens.length === 0) {
      setMoveTimerActive(false);
      return;
    }

    const TOTAL_MOVE_SECONDS = 6;
    setMoveTimerSeconds(TOTAL_MOVE_SECONDS);
    setMoveTimerActive(true);

    const startTime = Date.now();
    moveTimerIntervalRef.current = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, TOTAL_MOVE_SECONDS - elapsedSec);
      setMoveTimerSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(moveTimerIntervalRef.current);
        setMoveTimerActive(false);

        // Auto-pick coin with priority: capture opponent > reach home > furthest on path > first available
        const bestToken = getBestAutoMove(gameState, currentPlayer.playerIndex, gameState.diceValue);
        if (bestToken !== null) {
          handleSelectToken(bestToken);
        }
      }
    }, 200);

    // If single valid token, preview and auto-move after 1.8s
    if (validTokens.length === 1) {
      moveTimerAutoMoveRef.current = setTimeout(() => {
        handleSelectToken(validTokens[0]);
      }, 1800);
    }

    return () => {
      if (moveTimerIntervalRef.current) clearInterval(moveTimerIntervalRef.current);
      if (moveTimerAutoMoveRef.current) clearTimeout(moveTimerAutoMoveRef.current);
    };
  }, [gameState?.phase, gameState?.currentTurnIndex, validTokens, user?.id, gameState?.diceValue]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-budo-bg flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.25)] flex items-center justify-center animate-bounce mb-4">
          <span className="text-3xl">🎲</span>
        </div>
        <h2 className="text-lg font-black text-white tracking-wide">Connecting to Match...</h2>
        <p className="text-xs text-amber-400/90 font-mono mt-1">Room #{code}</p>
        <p className="text-[11px] text-slate-400 mt-2 max-w-xs">
          Synchronizing player state and game board...
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => {
              if (socket) {
                socket.emit('room:join', { roomCode: code, roomId: code, user: user || { id: -999, username: 'Player' } });
                socket.emit('game:getState', { roomId: code });
              }
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-400/30 text-xs font-bold active:scale-95 transition-all shadow-md"
          >
            🔄 Retry Sync
          </button>
          <button
            onClick={() => navigate('/game')}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold active:scale-95 transition-all"
          >
            Back to Hub
          </button>
        </div>
      </div>
    );
  }

  const myPlayerIndex = gameState.players.findIndex(p => p.userId === user?.id);
  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.userId === user?.id;
  const isWaitingRoll = gameState.phase === 'WAITING_ROLL';
  const isWaitingMove = gameState.phase === 'WAITING_MOVE';
  const isRollUrgent = rollTimerSeconds <= 3;

  const handleRollDice = () => {
    if (!isMyTurn || !isWaitingRoll || diceRolling) return;
    // Clear roll timer on manual roll
    if (rollTimerIntervalRef.current) clearInterval(rollTimerIntervalRef.current);
    autoRollInProgressRef.current = false;
    dispatch(setDiceRolling(true));
    socket.emit('dice:roll', { roomId: gameState.roomId || code });
  };

  const handleSelectToken = (tokenId) => {
    if (moveTimerIntervalRef.current) clearInterval(moveTimerIntervalRef.current);
    if (moveTimerAutoMoveRef.current) clearTimeout(moveTimerAutoMoveRef.current);
    setMoveTimerActive(false);

    if (!isMyTurn || !isWaitingMove) return;
    if (!validTokens.includes(tokenId)) return;

    socket.emit('token:move', {
      roomId: gameState.roomId || code,
      tokenId
    });
  };

  const handleSendChatMessage = (text) => {
    socket.emit('chat:message', { roomId: gameState.roomId || code, message: text });
  };

  const handleSendChatSticker = (sticker) => {
    socket.emit('chat:sticker', { roomId: gameState.roomId || code, sticker });
  };

  const handleSendChatAudio = (audioData, duration) => {
    socket.emit('chat:audio', { roomId: gameState.roomId || code, audioData, duration });
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-budo-bg flex flex-col items-center select-none overflow-hidden justify-between">
      {/* Game Header Bar */}
      <header className="w-full max-w-md md:max-w-2xl px-3 py-1.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex-shrink-0">
        <button
          onClick={() => { sound.playClick(); navigate('/game'); }}
          className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-slate-400">
            <span>Room #{code}</span>
          </div>
          <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
            {isMyTurn && <span className="animate-ping w-2 h-2 rounded-full bg-amber-400 inline-block" />}
            <span>{isMyTurn ? '🔥 YOUR TURN!' : `${currentPlayer?.username}'s Turn`}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Animated Sticker Reactions Button */}
          <button
            onClick={() => { sound.playClick(); setShowStickerPicker(true); }}
            className="p-1.5 rounded-xl bg-slate-900 text-amber-400 hover:text-amber-300 border border-slate-800 active:scale-90 transition-transform flex items-center justify-center shadow-sm"
            title="Send Animated Sticker Reaction"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Theme Chooser Button */}
          <button
            onClick={() => { sound.playClick(); setShowThemeModal(true); }}
            className="p-1.5 rounded-xl bg-slate-900 text-purple-400 hover:text-purple-300 border border-slate-800 active:scale-90 transition-transform"
            title="Choose Board Theme"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={() => dispatch(toggleSound())}
            className="p-1.5 rounded-xl bg-slate-900 text-slate-400 border border-slate-800"
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setChatOpen(true);
              setUnreadChat(0);
            }}
            className="relative p-1.5 rounded-xl bg-slate-900 text-blue-400 border border-slate-800 active:scale-90"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadChat > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                {unreadChat}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Compact Players Strip */}
      <div className="w-full max-w-md md:max-w-2xl px-2 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-shrink-0">
        {gameState.players.map((p, idx) => (
          <PlayerCard
            key={idx}
            player={p}
            isCurrentTurn={gameState.currentTurnIndex === idx}
            compact={true}
            remainingSeconds={remainingSeconds}
            moveTimer={{ seconds: moveTimerSeconds, total: 6, active: moveTimerActive && gameState.currentTurnIndex === idx }}
          />
        ))}
      </div>

      {/* Main Game Arena with Embedded Center Dice & Floating Stickers */}
      <main className="w-full max-w-md md:max-w-2xl flex-1 flex flex-col items-center justify-center p-1 md:p-2 min-h-0 overflow-hidden">
        {/* Dynamic Ludo Board with Center Dice & Step-by-Step Animation */}
        <div className="w-full h-full flex items-center justify-center min-h-0">
          <LudoBoard
            gameState={gameState}
            onSelectToken={handleSelectToken}
            validTokens={isMyTurn ? validTokens : []}
            themeName={themeName}
            moveTimer={{ seconds: moveTimerSeconds, total: 6, active: moveTimerActive }}
            myPlayerIndex={myPlayerIndex >= 0 ? myPlayerIndex : 0}
            stickers={floatingStickers}
            diceProps={{
              value: gameState.diceValue,
              isRolling: diceRolling,
              disabled: !isMyTurn || !isWaitingRoll,
              onRoll: handleRollDice,
              playerColor: currentPlayer?.color?.hex,
              timerSeconds: isMyTurn && isWaitingRoll ? rollTimerSeconds : null,
              isUrgent: isRollUrgent
            }}
          />
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
            {isMyTurn ? (
              isWaitingRoll ? (
                <span className="text-amber-400 animate-pulse">🎲 Tap center dice to roll!</span>
              ) : isWaitingMove ? (
                <span className="text-emerald-400">🎯 Tap highlighted coin to move!</span>
              ) : (
                <span className="text-slate-400">Processing move...</span>
              )
            ) : (
              <span className="text-slate-400">Waiting for {currentPlayer?.username}...</span>
            )}
          </span>
        </div>

        {isMyTurn && (
          <div className="flex items-center gap-1">
            {isWaitingRoll && (
              <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
                ⏱️ {rollTimerSeconds}s
              </span>
            )}
            {isWaitingMove && (
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

      {/* In-Game Voice & Chat Drawer */}
      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendChatMessage}
        onSendSticker={handleSendChatSticker}
        onSendAudio={handleSendChatAudio}
      />

      {/* Animated Sticker Reaction Picker Modal */}
      <StickerPickerModal
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={handleSendChatSticker}
      />
    </div>
  );
}
