import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Gamepad2, Trophy, User, Settings } from 'lucide-react';
import { sound } from '../utils/soundEngine';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide bottom nav inside active full-screen match
  if (location.pathname.startsWith('/game/')) {
    return null;
  }

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Play', icon: Gamepad2, path: '/play-options' },
    { label: 'Rank', icon: Trophy, path: '/rankings' },
    { label: 'Profile', icon: User, path: '/profile' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleNav = (path) => {
    sound.playClick();
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around max-w-md mx-auto sm:max-w-lg md:max-w-xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <button
            key={item.label}
            onClick={() => handleNav(item.path)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-90 ${
              isActive
                ? 'text-blue-400 font-bold -translate-y-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-blue-500/20 shadow-sm shadow-blue-500/30' : ''}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
