import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { Trophy, Medal, Crown } from 'lucide-react';

export default function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/rankings')
      .then((res) => {
        if (res.data.success) {
          setRankings(res.data.rankings);
        }
      })
      .catch((err) => {
        console.error('Leaderboard fetch error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-budo-bg pb-20 flex flex-col items-center">
      <Navbar />

      <main className="w-full max-w-md md:max-w-lg px-4 py-4 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 rounded-3xl p-5 shadow-xl text-slate-950 flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-widest opacity-80">Global Hall of Fame</div>
            <h2 className="text-2xl font-black">Leaderboard</h2>
            <p className="text-xs font-semibold opacity-90 mt-0.5">Top Budo Champions Worldwide</p>
          </div>
          <Trophy className="w-12 h-12 text-slate-950 opacity-90" />
        </div>

        {/* Top 3 Podium (if available) */}
        {rankings.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 pt-2 items-end">
            {/* Rank 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center text-center shadow-md order-1">
              <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-950 text-xs font-black flex items-center justify-center mb-1">
                2
              </span>
              <img
                src={rankings[1]?.avatar_url || '/avatars/default.png'}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-10 h-10 rounded-full border-2 border-slate-300 object-cover"
              />
              <span className="text-xs font-bold text-white mt-1 truncate max-w-[70px]">
                {rankings[1]?.username}
              </span>
              <span className="text-[10px] font-bold text-amber-400 font-mono">
                {rankings[1]?.points} pts
              </span>
            </div>

            {/* Rank 1 */}
            <div className="bg-slate-900 border-2 border-amber-400 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-xl shadow-amber-500/20 order-2 -translate-y-2 relative">
              <Crown className="w-6 h-6 text-amber-400 fill-amber-400 absolute -top-3" />
              <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center mb-1">
                1
              </span>
              <img
                src={rankings[0]?.avatar_url || '/avatars/default.png'}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover"
              />
              <span className="text-xs font-black text-white mt-1 truncate max-w-[80px]">
                {rankings[0]?.username}
              </span>
              <span className="text-xs font-black text-amber-300 font-mono">
                {rankings[0]?.points} pts
              </span>
            </div>

            {/* Rank 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center text-center shadow-md order-3">
              <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center mb-1">
                3
              </span>
              <img
                src={rankings[2]?.avatar_url || '/avatars/default.png'}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-10 h-10 rounded-full border-2 border-amber-700 object-cover"
              />
              <span className="text-xs font-bold text-white mt-1 truncate max-w-[70px]">
                {rankings[2]?.username}
              </span>
              <span className="text-[10px] font-bold text-amber-400 font-mono">
                {rankings[2]?.points} pts
              </span>
            </div>
          </div>
        )}

        {/* Full Rankings List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 space-y-1.5 shadow-xl">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading rankings...</div>
          ) : rankings.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No ranked matches yet.</div>
          ) : (
            rankings.map((user, idx) => (
              <div
                key={user.id || idx}
                className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/60 rounded-2xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center text-xs font-black ${
                    idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    #{idx + 1}
                  </span>
                  <img
                    src={user.avatar_url || '/avatars/default.png'}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-9 h-9 rounded-xl border border-slate-700 object-cover bg-slate-900"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">{user.username}</div>
                    <div className="text-[10px] text-slate-400">
                      {user.wins} Wins • {user.win_rate}% Win Rate
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-amber-300 font-mono">
                    {user.points}
                  </div>
                  <div className="text-[9px] uppercase font-bold text-slate-500">
                    Points
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
