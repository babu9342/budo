import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { socketService } from '../services/socket';
import { setGameState, setDiceRolling, setValidTokens, resetGame } from '../store/gameSlice';
import LudoBoard from '../components/LudoBoard';
import Dice from '../components/Dice';
import PlayerCard from '../components/PlayerCard';
import ChatDrawer from '../components/ChatDrawer';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { MessageSquare, ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { toggleSound } from '../store/settingsSlice';

export default function GamePlay() {
  const { code } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { gameState, diceRolling, validTokens } = useSelector((state) => state.game);
  const { sound: isSoundEnabled } = useSelector((state) => state.settings);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unreadChat, setUnreadChat] = useState(0);

  const socket = socketService.getSocket();

  useEffect(() => {
    if (!gameState) {
      socket.emit('game:getState', { roomId: code });
    }

    // Listen to dice result
    socket.on('dice:result', (data) => {
      dispatch(setDiceRolling(false));
      dispatch(setGameState(data.gameState));
      if (data.validTokens) {
        dispatch(setValidTokens(data.validTokens));
      }
      sound.playDiceRoll();
      triggerHaptic('medium');
    });

    // Listen to token update
    socket.on('token:update', (data) => {
      dispatch(setGameState(data.gameState));
      dispatch(setValidTokens([]));
      
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
    });
    socket.on('chat:sticker', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen) setUnreadChat((prev) => prev + 1);
    });
    socket.on('chat:audio', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen) setUnreadChat((prev) => prev + 1);
    });

    return () => {
      socket.off('dice:result');
      socket.off('token:update');
      socket.off('game:finish');
      socket.off('chat:message');
      socket.off('chat:sticker');
      socket.off('chat:audio');
    };
  }, [code, gameState, chatOpen, dispatch, navigate, socket]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-budo-bg flex flex-col items-center justify-center p-4">
        <div className="text-sm font-bold text-amber-400">Loading Budo Match...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.userId === user?.id;
  const isWaitingRoll = gameState.phase === 'WAITING_ROLL';
  const isWaitingMove = gameState.phase === 'WAITING_MOVE';

  const handleRollDice = () => {
    if (!isMyTurn || !isWaitingRoll || diceRolling) return;
    dispatch(setDiceRolling(true));
    socket.emit('dice:roll', { roomId: gameState.roomId || code });
  };

  const handleSelectToken = (tokenId) => {
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
    <div className="min-h-screen bg-budo-bg flex flex-col items-center select-none overflow-x-hidden">
      {/* Game Header Bar */}
      <header className="w-full max-w-md md:max-w-2xl px-3 py-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <button
          onClick={() => { sound.playClick(); navigate('/'); }}
          className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            Room #{code}
          </div>
          <div className="text-xs font-black text-amber-400">
            {isMyTurn ? '🔥 YOUR TURN!' : `${currentPlayer?.username}'s Turn`}
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Main Game Arena */}
      <main className="w-full max-w-md md:max-w-2xl flex-1 flex flex-col items-center justify-between p-2">
        {/* Top Opponents Strip */}
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

        {/* Dynamic Ludo Board */}
        <div className="w-full flex items-center justify-center my-auto">
          <LudoBoard
            gameState={gameState}
            onSelectToken={handleSelectToken}
            validTokens={isMyTurn ? validTokens : []}
          />
        </div>

        {/* Bottom Turn Controls & Animated 3D Dice */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-3 flex items-center justify-between shadow-2xl backdrop-blur-md mt-2">
          <div className="flex items-center gap-3">
            <img
              src={currentPlayer?.avatarUrl || '/avatars/default.png'}
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
                {isWaitingRoll && (isMyTurn ? 'Tap dice to roll' : 'Rolling dice...')}
                {isWaitingMove && (isMyTurn ? 'Choose glowing token' : 'Selecting token...')}
              </div>
            </div>
          </div>

          {/* Dice Component */}
          <Dice
            value={gameState.diceValue}
            isRolling={diceRolling}
            disabled={!isMyTurn || !isWaitingRoll}
            onRoll={handleRollDice}
            playerColor={currentPlayer?.color.hex}
          />
        </div>
      </main>

      {/* In-Game Voice & Chat Drawer */}
      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendChatMessage}
        onSendSticker={handleSendChatSticker}
        onSendAudio={handleSendChatAudio}
      />
    </div>
  );
}
