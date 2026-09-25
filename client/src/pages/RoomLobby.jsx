import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { updateLobby, setRoom } from '../store/roomSlice';
import { setGameState } from '../store/gameSlice';
import Navbar from '../components/Navbar';
import { 
  Users, Share2, Play, Crown, 
  Clock, Bot, Copy, Check, UserMinus, AlertCircle
} from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function RoomLobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { lobbyPlayers, currentRoom } = useSelector((state) => state.room);

  const [copied, setCopied] = useState(false);
  const [roomError, setRoomError] = useState('');

  const socket = socketService.getSocket();
  const isHost = lobbyPlayers[0]?.userId === user?.id || currentRoom?.host_id === user?.id;
  const maxPlayers = currentRoom?.max_players || 4;
  const shareUrl = `${window.location.origin}/join/${code}`;

  useEffect(() => {
    // 1. Fetch Room metadata
    api.get(`/rooms/${code}`)
      .then((res) => {
        if (res.data.success) {
          dispatch(setRoom({ room: res.data.room, isHost: res.data.room.host_id === user?.id }));
          
          if (res.data.room.status === 'PLAYING') {
            navigate(`/game/${code}`);
            return;
          }

          // Connect to socket room
          socket.emit('room:join', {
            roomId: res.data.room.id,
            roomCode: code,
            user: user || { id: -999, username: 'Guest' }
          });
        }
      })
      .catch((err) => {
        console.error('Error fetching room:', err);
        setRoomError(err.response?.data?.message || 'Failed to load room');
      });

    // 2. Listen to lobby updates
    socket.on('room:update', (data) => {
      if (data.lobby) {
        dispatch(updateLobby({ players: data.lobby.players, hostId: data.lobby.hostId }));
      }
    });

    // 3. Listen to game start
    socket.on('game:start', (data) => {
      sound.playTurn();
      triggerHaptic('medium');
      dispatch(setGameState(data.game));
      navigate(`/game/${code}`);
    });

    // 4. Listen to already started game
    socket.on('game:alreadyStarted', (data) => {
      if (data.game) {
        dispatch(setGameState(data.game));
      }
      navigate(`/game/${code}`);
    });

    // 5. Listen to room kicked event
    socket.on('room:kicked', (data) => {
      sound.playClick();
      alert(data?.message || 'You have been removed from the room by the host.');
      navigate('/home');
    });

    // 6. Listen to room full event
    socket.on('room:full', () => {
      setRoomError('This room is full and cannot accept more players.');
    });

    // 7. Listen to general socket errors
    socket.on('error', (err) => {
      setRoomError(err?.message || 'Failed to start match');
    });

    return () => {
      socket.off('room:update');
      socket.off('game:start');
      socket.off('game:alreadyStarted');
      socket.off('room:kicked');
      socket.off('room:full');
      socket.off('error');
    };
  }, [code, user, dispatch, navigate, socket]);

  // Handle Share Room Link
  const handleShare = async () => {
    sound.playClick();
    const shareMessage = `🎲 Join my ${maxPlayers}-Player Budo game!\n\nRoom Code: ${code}\n\nJoin directly:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Budo ${maxPlayers}-Player Match`,
          text: shareMessage,
          url: shareUrl
        });
      } catch (err) {
        // Fallback
      }
    } else {
      // Direct WhatsApp intent
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleCopy = () => {
    sound.playClick();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddBot = () => {
    sound.playClick();
    if (lobbyPlayers.length < maxPlayers) {
      socket.emit('room:addBot', {
        roomId: currentRoom?.id || code,
        roomCode: code,
        difficulty: 'medium'
      });
    }
  };

  const handleKickPlayer = (targetUserId, targetUsername) => {
    sound.playClick();
    if (!isHost) return;

    if (window.confirm(`Are you sure you want to remove ${targetUsername} from the room?`)) {
      socket.emit('room:kickPlayer', {
        roomId: currentRoom?.id || code,
        roomCode: code,
        userId: targetUserId
      });
    }
  };

  const handleStartGame = () => {
    setRoomError('');
    sound.playVictory();
    triggerHaptic('heavy');
    socket.emit('room:start', {
      roomId: currentRoom?.id || code,
      roomCode: code
    });
  };

  const isRoomFull = lobbyPlayers.length >= maxPlayers;

  return (
    <div className="min-h-screen bg-budo-bg pb-16 flex flex-col items-center">
      <Navbar />

      <main className="w-full max-w-md md:max-w-lg px-4 py-4 space-y-4">
        {roomError && (
          <div className="bg-red-500/15 border border-red-500/40 text-red-300 p-3 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{roomError}</span>
          </div>
        )}

        {/* Room Header Card */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 shadow-2xl text-center relative overflow-hidden">
          <div className="text-xs uppercase font-bold tracking-widest text-slate-400 flex items-center justify-center gap-1.5">
            <span>Budo {maxPlayers}-Player Match Lobby</span>
          </div>

          <div className="my-2 flex items-center justify-center gap-2">
            <span className="font-mono text-3xl font-black text-amber-400 tracking-wider">
              {code}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-90 transition-transform"
              title="Copy Room Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-blue-500/20 rounded-full border border-blue-500/40 text-blue-300 text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>
              {lobbyPlayers.length} / {maxPlayers} Players {isRoomFull ? '(Room Full)' : ''}
            </span>
          </div>
        </div>

        {/* Player Roster */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase text-slate-300">
              Players in Room ({lobbyPlayers.length}/{maxPlayers})
            </span>
            {isHost && !isRoomFull && (
              <button
                onClick={handleAddBot}
                className="flex items-center gap-1 text-xs font-bold text-cyan-400 bg-cyan-500/15 hover:bg-cyan-500/25 px-2.5 py-1 rounded-xl active:scale-95 transition-all"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>+ Add Bot</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {lobbyPlayers.map((player, idx) => {
              const isPlayerHost = idx === 0 || player.userId === currentRoom?.host_id;
              return (
                <div
                  key={player.userId || idx}
                  className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800/80 rounded-2xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={player.avatarUrl || '/avatars/default.png'}
                      alt={player.username}
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 rounded-xl border border-slate-700 object-cover bg-slate-900 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs md:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                        <span className="truncate">{player.username}</span>
                        {isPlayerHost && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                        {player.isBot && <Bot className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Slot #{idx + 1} • {player.rankingPoints || 1000} Pts
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isPlayerHost ? (
                      <span className="text-[11px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        HOST
                      </span>
                    ) : (
                      <>
                        <span className="text-[11px] font-bold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                          Joined
                        </span>

                        {/* Host Kick Button */}
                        {isHost && (
                          <button
                            onClick={() => handleKickPlayer(player.userId, player.username)}
                            className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 active:scale-90 transition-transform"
                            title={`Remove ${player.username} from room`}
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty Slot Placeholders */}
            {Array.from({ length: Math.max(0, maxPlayers - lobbyPlayers.length) }).map((_, slotIdx) => (
              <div
                key={`empty-slot-${slotIdx}`}
                className="flex items-center justify-between p-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-600 font-mono text-xs">
                    {lobbyPlayers.length + slotIdx + 1}
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    Waiting for player to join...
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Open Slot
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5 pt-1">
          {/* Share Room Button (WhatsApp & Web Share) */}
          {!isRoomFull && (
            <button
              onClick={handleShare}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Invite ({lobbyPlayers.length}/{maxPlayers})</span>
            </button>
          )}

          {/* Host Start Game Button */}
          {isHost ? (
            <button
              onClick={handleStartGame}
              className="w-full py-4 text-xs font-black uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>
                {isRoomFull
                  ? `Start ${maxPlayers}-Player Match Now`
                  : `Start Match Now (${lobbyPlayers.length}/${maxPlayers} Players)`}
              </span>
            </button>
          ) : (
            <div className="w-full py-3.5 px-4 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs font-bold text-slate-300 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>
                {isRoomFull
                  ? 'All players joined! Waiting for host to start match...'
                  : `Waiting for host to start match (${lobbyPlayers.length}/${maxPlayers} Joined)...`}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

