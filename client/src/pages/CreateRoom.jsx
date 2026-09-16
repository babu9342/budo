import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setRoom } from '../store/roomSlice';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { Users, Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import { sound } from '../utils/soundEngine';

export default function CreateRoom() {
  const [playerCount, setPlayerCount] = useState(4);
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleCreate = async () => {
    sound.playClick();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/rooms', {
        maxPlayers: playerCount,
        isPrivate
      });

      if (res.data.success) {
        dispatch(setRoom({ room: res.data.room, isHost: true }));
        navigate(`/room/${res.data.room.code}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-budo-bg pb-20 flex flex-col items-center">
      <Navbar />

      <main className="w-full max-w-md md:max-w-lg px-4 py-4 space-y-5">
        <button
          onClick={() => { sound.playClick(); navigate('/'); }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5">
          <div>
            <h2 className="text-xl font-black text-white">Create Match Room</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose the number of players (2 to 8) and configure match lobby.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* Player Count Selector (2, 4, 6, 8) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Select Player Count
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 4, 6, 8].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => { sound.playClick(); setPlayerCount(count); }}
                  className={`py-3.5 rounded-2xl border flex flex-col items-center justify-center transition-all active:scale-95 ${
                    playerCount === count
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 font-black scale-102'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 mb-0.5" />
                  <span className="text-sm">{count}P</span>
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Private Room</div>
                <div className="text-[11px] text-slate-400">Accessible only via invite link or code</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { sound.playClick(); setIsPrivate(!isPrivate); }}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                isPrivate ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isPrivate ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span>{loading ? 'Creating Lobby...' : 'Create Room & Invite'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
