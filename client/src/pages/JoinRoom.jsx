import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setRoom } from '../store/roomSlice';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { KeyRound, ArrowLeft, Delete } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { triggerHaptic } from '../utils/haptics';

export default function JoinRoom() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleDigit = (digit) => {
    sound.playClick();
    triggerHaptic('light');
    if (code.length < 8) {
      setCode((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    sound.playClick();
    setCode((prev) => prev.slice(0, -1));
  };

  const handleJoin = async () => {
    if (code.length < 8) {
      setError('Please enter the full 8-digit room code');
      return;
    }

    sound.playClick();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/rooms/join', { code });
      if (res.data.success) {
        dispatch(setRoom({ room: res.data.room, isHost: false }));
        navigate(`/room/${code}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-budo-bg pb-20 flex flex-col items-center">
      <Navbar />

      <main className="w-full max-w-md md:max-w-lg px-4 py-4 space-y-4">
        <button
          onClick={() => {
            sound.playClick();
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate('/home');
            }
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-black text-white">Enter Room Code</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ask your friend for the 8-digit Budo game code.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs flex items-center justify-between gap-2">
              <span>{error}</span>
              <button
                type="button"
                onClick={handleJoin}
                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-lg border border-red-500/30 text-[11px] whitespace-nowrap active:scale-95 transition-all"
              >
                🔄 Retry
              </button>
            </div>
          )}

          {/* 8-Digit Display Boxes */}
          <div className="flex justify-center items-center gap-1.5 sm:gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
              const char = code[idx] || '';
              return (
                <div
                  key={idx}
                  className={`w-9 h-12 sm:w-11 sm:h-14 rounded-xl border-2 flex items-center justify-center font-mono text-lg sm:text-xl font-black transition-all ${
                    char
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300 shadow-md shadow-amber-500/20'
                      : 'border-slate-800 bg-slate-950 text-slate-600'
                  }`}
                >
                  {char}
                </div>
              );
            })}
          </div>

          {/* Numeric Keypad for fast touch input */}
          <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-lg font-black text-white active:scale-95 transition-all shadow-inner"
              >
                {digit}
              </button>
            ))}
            <div className="flex items-center justify-center"></div>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-lg font-black text-white active:scale-95 transition-all shadow-inner"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 active:scale-95 transition-all"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={handleJoin}
            disabled={code.length < 8 || loading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span>{loading ? 'Joining Room...' : 'Enter Match Lobby'}</span>
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
