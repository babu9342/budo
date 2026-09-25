import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Trophy, Volume2, VolumeX } from 'lucide-react';
import BudoLogo from './BudoLogo';
import BackButton from './BackButton';
import { sound } from '../utils/soundEngine';

export default function Navbar({ showBack = true }) {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  const isHomeOrRoot = location.pathname === '/' || location.pathname === '/home';

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {!isHomeOrRoot && showBack && (
          <BackButton className="p-1.5 rounded-xl border-slate-700/60" />
        )}
        <div 
          onClick={() => { sound.playClick(); navigate(user ? '/home' : '/'); }}
          className="cursor-pointer flex items-center gap-2 active:scale-95 transition-transform"
        >
          <BudoLogo size="sm" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <div 
              onClick={() => { sound.playClick(); navigate('/rankings'); }}
              className="flex items-center gap-1.5 bg-slate-800/90 border border-amber-500/30 px-2.5 py-1 rounded-full shadow-inner cursor-pointer active:scale-95 transition-transform"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">
                {user.ranking_points || 1000}
              </span>
            </div>

            <div 
              onClick={() => { sound.playClick(); navigate('/profile'); }}
              className="relative cursor-pointer active:scale-90 transition-transform"
            >
              <img
                src={user.avatar_url || '/avatars/default.png'}
                alt={user.username}
                className="w-8 h-8 rounded-full border border-blue-500/50 object-cover bg-slate-800 shadow-sm"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>
          </>
        ) : (
          <button
            onClick={() => { sound.playClick(); navigate('/login'); }}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-md shadow-blue-500/20"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
