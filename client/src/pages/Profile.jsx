import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../store/authSlice';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import RetroPhotoStudio from '../components/RetroPhotoStudio';
import { Trophy, Sparkles, Award, Swords, Flame, Edit3, Check, Clock } from 'lucide-react';
import { sound } from '../utils/soundEngine';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [showStudio, setShowStudio] = useState(searchParams.get('tab') === '90s');
  const [history, setHistory] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [usernameInput, setUsernameInput] = useState(user?.username || '');

  useEffect(() => {
    if (user?.id) {
      api.get(`/rankings/history/${user.id}`)
        .then((res) => {
          if (res.data.success) {
            setHistory(res.data.history);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleApplyRetroPhoto = async (dataUrl) => {
    try {
      dispatch(updateUser({ avatar_url: dataUrl }));
      setShowStudio(false);
      // Persist to backend
      await api.put('/users/me', { avatar_url: dataUrl }).catch(() => {});
    } catch (err) {
      console.error('Failed to update avatar:', err);
    }
  };

  const handleSaveUsername = async () => {
    sound.playClick();
    if (!usernameInput.trim()) return;
    try {
      const res = await api.put('/users/me', { username: usernameInput.trim() });
      if (res.data.success) {
        dispatch(updateUser({ username: usernameInput.trim() }));
        setEditingName(false);
      }
    } catch (e) {
      setEditingName(false);
    }
  };

  const winRate = user?.games_played > 0 ? ((user.wins / user.games_played) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-budo-bg pb-20 flex flex-col items-center">
      <Navbar />

      <main className="w-full max-w-md md:max-w-lg px-4 py-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user?.avatar_url || '/avatars/default.png'}
                alt={user?.username}
                className="w-16 h-16 rounded-2xl border-2 border-amber-400 object-cover bg-slate-800 shadow-md"
              />
              <button
                onClick={() => { sound.playClick(); setShowStudio(true); }}
                className="absolute -bottom-2 -right-2 bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 p-1.5 rounded-full border border-slate-900 shadow-lg active:scale-95"
                title="Create 90s Retro Avatar"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white"
                    />
                    <button onClick={handleSaveUsername} className="p-1 bg-emerald-600 rounded text-white">
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-base md:text-lg font-black text-white">{user?.username}</h2>
                    <button onClick={() => setEditingName(true)} className="text-slate-400 hover:text-white">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-400">{user?.email}</div>

              <div className="inline-flex items-center gap-1 mt-1 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-300">
                  {user?.ranking_points || 1000} Ranking Points
                </span>
              </div>
            </div>
          </div>

          {/* 90s Profile Studio Banner Button */}
          <button
            onClick={() => { sound.playClick(); setShowStudio(true); }}
            className="mt-4 w-full py-2.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/40 rounded-2xl flex items-center justify-center gap-2 text-amber-300 text-xs font-bold active:scale-98 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span>Trending: Create 90s Vintage Profile Photo</span>
          </button>
        </div>

        {/* Career Stats Grid */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 px-1">
            Career Battle Records
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Played</div>
              <div className="text-base font-black text-white mt-0.5">{user?.games_played || 0}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Wins</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">{user?.wins || 0}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-blue-400">Win Rate</div>
              <div className="text-base font-black text-blue-400 mt-0.5">{winRate}%</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-red-400">Losses</div>
              <div className="text-base font-black text-red-400 mt-0.5">{user?.losses || 0}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-amber-400">Captures</div>
              <div className="text-base font-black text-amber-400 mt-0.5">{user?.captures || 0}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-purple-400">Rating</div>
              <div className="text-base font-black text-purple-400 mt-0.5">{user?.ranking_points || 1000}</div>
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 px-1">
            Recent Match History
          </h3>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 space-y-2">
            {history.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No recorded match history yet.
              </div>
            ) : (
              history.map((h, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-950 rounded-2xl border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold ${h.result === 'WIN' ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {h.result}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(h.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <span className={`text-xs font-bold ${h.points_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {h.points_change >= 0 ? `+${h.points_change}` : h.points_change} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* 90s Photo Studio Modal */}
      {showStudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <RetroPhotoStudio
            currentAvatar={user?.avatar_url}
            onApplyPhoto={handleApplyRetroPhoto}
            onCancel={() => setShowStudio(false)}
          />
        </div>
      )}

      <BottomNav />
    </div>
  );
}
