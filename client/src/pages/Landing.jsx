import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Gamepad2, 
  Users, 
  Bot, 
  Trophy, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  Volume2, 
  Palette, 
  ArrowRight,
  Play,
  LogIn,
  UserPlus,
  Zap,
  Dice5
} from 'lucide-react';
import BudoLogo from '../components/BudoLogo';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleStartGame = () => {
    sound.playClick();
    triggerHaptic('medium');
    if (user) {
      navigate('/game');
    } else {
      navigate('/login');
    }
  };

  const handlePlayOffline = () => {
    sound.playClick();
    triggerHaptic('light');
    navigate('/offline');
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 overflow-y-auto bg-budo-bg text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Navigation Bar */}
      <nav className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between z-20 border-b border-slate-800/60 bg-budo-bg/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <BudoLogo size="sm" subtitle={false} />
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider text-amber-400">
            Multiplayer v2.0
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:border-slate-700 transition-colors"
              >
                <img
                  src={user.avatar_url || '/avatars/default.png'}
                  alt={user.username}
                  className="w-5 h-5 rounded-full object-cover border border-amber-400"
                />
                <span className="max-w-[100px] truncate">{user.username}</span>
              </Link>
              <button
                onClick={handleStartGame}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-300 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Go to Game</span>
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span>Login</span>
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full max-w-5xl mx-auto px-4 pt-8 pb-12 flex flex-col items-center text-center">
        {/* Glow backdrop effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner mb-6 animate-bounce-subtle">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-300">
            Real-Time 2 to 8 Player Modern Ludo Board
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-3xl leading-[1.1]">
          Roll the Dice.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            Rule the Board.
          </span>
        </h1>

        {/* Subtitle Intro */}
        <p className="mt-4 text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl font-medium leading-relaxed">
          Welcome to <strong className="text-amber-400">BUDO</strong> — the fast-paced, high-stakes multiplayer Ludo experience. 
          Challenge friends in private rooms, compete against smart AI bots, chat with live voice & stickers, and climb the leaderboard!
        </p>

        {/* Call to Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md">
          <button
            id="landing-play-btn"
            onClick={handleStartGame}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-2.5 border-2 border-yellow-200/50"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>{user ? 'Play Now (Enter Game)' : 'Start Game / Play Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handlePlayOffline}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 text-slate-200 hover:text-white font-bold text-sm tracking-wide active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Bot className="w-5 h-5 text-purple-400" />
            <span>Play Offline vs AI</span>
          </button>
        </div>

        {/* Interactive Board Preview Card */}
        <div className="mt-12 w-full max-w-md md:max-w-lg bg-slate-900/90 border-2 border-slate-800/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-blue-500" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Dice5 className="w-3.5 h-3.5" /> Center Dice Arena
            </span>
          </div>

          {/* Mini Mock Board Graphic */}
          <div className="aspect-square w-full rounded-2xl bg-slate-950 border border-slate-800 p-2 grid grid-cols-3 grid-rows-3 gap-1 shadow-inner relative">
            {/* Top Left - Red Yard */}
            <div className="rounded-xl bg-red-950/80 border-2 border-red-500/60 flex items-center justify-center p-2 relative overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-red-500/30 border border-red-400 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
            </div>
            {/* Top - Green Runway */}
            <div className="rounded-xl bg-slate-900/90 border border-emerald-500/40 flex flex-col items-center justify-center">
              <span className="text-emerald-400 text-xs font-black">★</span>
            </div>
            {/* Top Right - Green Yard */}
            <div className="rounded-xl bg-emerald-950/80 border-2 border-emerald-500/60 flex items-center justify-center p-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
            </div>
            {/* Left - Red Runway */}
            <div className="rounded-xl bg-slate-900/90 border border-red-500/40 flex items-center justify-center">
              <span className="text-red-400 text-xs font-black">★</span>
            </div>
            {/* CENTER - Interactive Dice Preview Hub */}
            <div className="rounded-xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-400 flex flex-col items-center justify-center p-1 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border-2 border-amber-400 flex items-center justify-center shadow-lg animate-bounce-subtle">
                <span className="text-base font-black text-amber-400">⚅</span>
              </div>
              <span className="text-[8px] font-black uppercase text-amber-300 mt-0.5">Center Dice</span>
            </div>
            {/* Right - Yellow Runway */}
            <div className="rounded-xl bg-slate-900/90 border border-yellow-500/40 flex items-center justify-center">
              <span className="text-yellow-400 text-xs font-black">★</span>
            </div>
            {/* Bottom Left - Blue Yard */}
            <div className="rounded-xl bg-blue-950/80 border-2 border-blue-500/60 flex items-center justify-center p-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/30 border border-blue-400 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </div>
            </div>
            {/* Bottom - Blue Runway */}
            <div className="rounded-xl bg-slate-900/90 border border-blue-500/40 flex flex-col items-center justify-center">
              <span className="text-blue-400 text-xs font-black">★</span>
            </div>
            {/* Bottom Right - Yellow Yard */}
            <div className="rounded-xl bg-yellow-950/80 border-2 border-yellow-500/60 flex items-center justify-center p-2">
              <div className="w-6 h-6 rounded-full bg-yellow-500/30 border border-yellow-400 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>✨ Center Board Dice Placement</span>
            <span className="text-emerald-400 font-bold">● Active Turn Spatial Cues</span>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="w-full max-w-5xl mx-auto px-4 py-10 border-t border-slate-800/80">
        <h2 className="text-xl sm:text-2xl font-black text-center text-white mb-8">
          Next-Generation Ludo Features
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Card 1: 2-8 Player Multiplayer */}
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-3xl hover:border-slate-700 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white">2 to 8 Player Multiplayer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Play classic 4-player Ludo or scale up to intense 6 and 8 player radial battle boards in real-time.
            </p>
          </div>

          {/* Card 2: Authentic Rules */}
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-3xl hover:border-slate-700 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white">Authentic 6 Rules & Bonus Rolls</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Roll a 6 to bring coins out of your home yard, earn bonus rolls, capture opponent coins, and sprint to the finish.
            </p>
          </div>

          {/* Card 3: Center Dice & Spatial Glow */}
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-3xl hover:border-slate-700 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white">Center Dice & Turn Indicators</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Embedded center-board dice with glowing yard outlines and active player cues so you never miss your turn.
            </p>
          </div>

          {/* Card 4: Voice & Chat */}
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-3xl hover:border-slate-700 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white">Voice Messages & Stickers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Send voice notes, interactive animated stickers, and live chat reactions mid-match without leaving the board.
            </p>
          </div>

          {/* Card 5: Smart Bot AI */}
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-3xl hover:border-slate-700 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white">Smart Offline Bot AI</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No internet? No problem! Practice anytime against adaptive computer bots across multiple difficulty levels.
            </p>
          </div>

          {/* Card 6: Rich Board Themes */}
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-3xl hover:border-slate-700 transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-white">Custom Board Themes</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Choose from Classic, Royal Pachisi Heritage, Dark Neon, Cyberpunk, and Wooden Board themes.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="w-full max-w-5xl mx-auto px-4 py-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <BudoLogo size="xs" subtitle={false} />
          <span>&copy; {new Date().getFullYear()} BUDO. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/rankings" className="text-slate-400 hover:text-amber-400 transition-colors">
            Leaderboard
          </Link>
          <Link to="/offline" className="text-slate-400 hover:text-amber-400 transition-colors">
            Offline Mode
          </Link>
          <Link to="/login" className="text-slate-400 hover:text-amber-400 transition-colors">
            Account Login
          </Link>
        </div>
      </footer>
    </div>
  );
}
