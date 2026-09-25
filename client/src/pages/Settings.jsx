import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSound, toggleMusic, toggleVibration } from '../store/settingsSlice';
import { logout } from '../store/authSlice';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { Volume2, VolumeX, Music, Smartphone, LogOut, HelpCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import { sound } from '../utils/soundEngine';

export default function Settings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { sound: isSound, music: isMusic, vibration: isVibration } = useSelector((state) => state.settings);
  const [showRules, setShowRules] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleBack = () => {
    sound.playClick();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  const handleLogout = () => {
    sound.playClick();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-budo-bg pb-20 flex flex-col items-center">
      <Navbar />

      <main className="w-full max-w-md md:max-w-lg px-4 py-4 space-y-4">
        <div className="flex items-center gap-3 px-1">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 active:scale-90 transition-transform"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-black text-white">Game Settings</h2>
        </div>


        {/* Audio & Haptics Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold uppercase text-slate-400">Audio & Feedback</div>

          {/* Sound FX */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                {isSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">Sound Effects</div>
                <div className="text-[10px] text-slate-400">Dice roll, move & capture audio</div>
              </div>
            </div>
            <button
              onClick={() => dispatch(toggleSound())}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                isSound ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isSound ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Music */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Background Music</div>
                <div className="text-[10px] text-slate-400">Ambient arcade atmosphere</div>
              </div>
            </div>
            <button
              onClick={() => dispatch(toggleMusic())}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                isMusic ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isMusic ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Haptic Vibration</div>
                <div className="text-[10px] text-slate-400">Mobile tactile touch response</div>
              </div>
            </div>
            <button
              onClick={() => dispatch(toggleVibration())}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                isVibration ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isVibration ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Board Color Theme Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold uppercase text-slate-400">Board Color & Visual Theme</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'classic', name: 'Classic Royal', icon: '👑' },
              { id: 'cyber', name: 'Cyber Neon AMOLED', icon: '⚡' },
              { id: 'wood', name: 'Wooden Prestige', icon: '🪵' },
              { id: 'emerald', name: 'Emerald Jade', icon: '💎' },
              { id: 'galaxy', name: 'Midnight Galaxy', icon: '🌌' }
            ].map((t) => {
              const activeTheme = localStorage.getItem('budo_board_theme') || 'classic';
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    sound.playClick();
                    localStorage.setItem('budo_board_theme', t.id);
                    navigate(0); // Refresh to apply
                  }}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all active:scale-95 ${
                    activeTheme === t.id
                      ? 'bg-purple-600/30 border-purple-400 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{t.icon}</span>
                    <span>{t.name}</span>
                  </span>
                  {activeTheme === t.id && <span className="text-purple-400 text-xs font-bold">Active</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* How to Play Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2">
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-white">Ludo Rules & Guide</div>
                <div className="text-[10px] text-slate-400">Learn how tokens, captures & stars work</div>
              </div>
            </div>
            <span className="text-xs text-amber-400 font-bold">{showRules ? 'Hide' : 'View'}</span>
          </button>

          {showRules && (
            <div className="pt-2 text-xs text-slate-300 space-y-2 border-t border-slate-800 mt-2">
              <p>• <strong>Roll a 6:</strong> Bring a token out of Home yard into the starting track.</p>
              <p>• <strong>Bonus Turn:</strong> Awarded on rolling a 6, capturing an opponent, or entering Finish.</p>
              <p>• <strong>Captures:</strong> Landing on an opponent sends them back to Home (unless on a safe Star spot).</p>
              <p>• <strong>Safe Spots (★):</strong> Stars and colored starting cells protect your tokens.</p>
              <p>• <strong>Winning:</strong> First player to get all 4 tokens to the central triangle wins!</p>
            </div>
          )}
        </div>

        {/* Logout Section */}
        <div className="pt-4">
          {showLogoutConfirm ? (
            <div className="bg-red-500/15 border border-red-500/40 p-4 rounded-3xl space-y-3 text-center">
              <p className="text-xs font-bold text-red-400">Are you sure you want to log out of Budo?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleLogout}
                  className="py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl"
                >
                  Yes, Logout
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { sound.playClick(); setShowLogoutConfirm(true); }}
              className="w-full py-3.5 bg-slate-900 hover:bg-red-950/40 border border-red-500/40 text-red-400 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Account</span>
            </button>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
