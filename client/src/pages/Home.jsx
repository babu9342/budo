import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Trophy, Gamepad2, Users, KeyRound, Bot, Sparkles, Flame, ShieldAlert } from 'lucide-react';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function Home() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleAction = (path) => {
    sound.playClick();
    triggerHaptic('light');
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-budo-bg pb-20 flex flex-col items-center">
      <Navbar />

      <main className="w-full max-w-md md:max-w-lg px-4 py-4 flex flex-col space-y-4">
        {/* Welcome Player Header Card */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between z-10 relative">
            <div className="flex items-center gap-3">
              <img
                src={user?.avatar_url || '/avatars/default.png'}
                alt="Avatar"
                loading="lazy"
                decoding="async"
                className="w-14 h-14 rounded-2xl border-2 border-amber-400/80 object-cover bg-slate-800 shadow-md"
              />
              <div>
                <div className="text-xs font-semibold text-slate-400">Welcome Back,</div>
                <h2 className="text-lg font-black text-white flex items-center gap-1.5">
                  <span>{user?.username || 'Player'}</span>
                  <span className="text-base">👋</span>
                </h2>
                <div className="inline-flex items-center gap-1 mt-0.5 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] font-black text-amber-300">
                    {user?.ranking_points || 1000} Points
                  </span>
                </div>
              </div>
            </div>

            {/* 90s Photo CTA Badge */}
            <button
              onClick={() => handleAction('/profile?tab=90s')}
              className="bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 p-2.5 rounded-2xl shadow-lg shadow-amber-500/30 flex flex-col items-center justify-center active:scale-95 transition-transform"
              title="Create 90s Retro Photo"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase mt-0.5">90s Studio</span>
            </button>
          </div>
        </div>

        {/* Action Menu Buttons */}
        <div className="space-y-3 pt-1">
          {/* 1. PLAY ONLINE / QUICK MATCH */}
          <button
            onClick={() => handleAction('/create-room')}
            className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-4 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-between active:scale-98 transition-all border border-blue-400/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Gamepad2 className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <div className="text-base font-black tracking-wide uppercase">PLAY ONLINE</div>
                <div className="text-xs text-blue-100/80">Match with 2 to 8 players in real-time</div>
              </div>
            </div>
            <Flame className="w-6 h-6 text-amber-300 animate-pulse" />
          </button>

          {/* 2. CREATE PRIVATE ROOM */}
          <button
            onClick={() => handleAction('/create-room')}
            className="w-full bg-slate-900/90 hover:bg-slate-800 border-2 border-emerald-500/40 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black tracking-wide text-emerald-400 uppercase">CREATE ROOM</div>
                <div className="text-[11px] text-slate-400">Host private room & invite via WhatsApp</div>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">2-8 P</span>
          </button>

          {/* 3. JOIN WITH ROOM CODE */}
          <button
            onClick={() => handleAction('/join-room')}
            className="w-full bg-slate-900/90 hover:bg-slate-800 border-2 border-amber-500/40 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black tracking-wide text-amber-400 uppercase">JOIN ROOM</div>
                <div className="text-[11px] text-slate-400">Enter 8-digit numeric room invitation code</div>
              </div>
            </div>
            <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">ENTER CODE</span>
          </button>

          {/* 4. OFFLINE / VS COMPUTER AI */}
          <button
            onClick={() => handleAction('/offline')}
            className="w-full bg-slate-900/90 hover:bg-slate-800 border-2 border-purple-500/40 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Bot className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black tracking-wide text-purple-400 uppercase">OFFLINE / VS AI</div>
                <div className="text-[11px] text-slate-400">Play without internet against smart computer bots</div>
              </div>
            </div>
            <span className="text-xs font-black text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg">AI / LOCAL</span>
          </button>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Played</div>
            <div className="text-base font-black text-white mt-0.5">{user?.games_played || 0}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Wins</div>
            <div className="text-base font-black text-emerald-400 mt-0.5">{user?.wins || 0}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-amber-400">Captures</div>
            <div className="text-base font-black text-amber-400 mt-0.5">{user?.captures || 0}</div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
