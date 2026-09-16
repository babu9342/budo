import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { resetGame } from '../store/gameSlice';
import { Trophy, Crown, ArrowRight, RotateCcw, Award } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import confetti from 'canvas-confetti';

export default function Result() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { winner, rankings } = useSelector((state) => state.game);

  useEffect(() => {
    sound.playVictory();
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 }
    });
  }, []);

  const isUserWinner = winner?.userId === user?.id;

  const handleHome = () => {
    sound.playClick();
    dispatch(resetGame());
    navigate('/');
  };

  const handlePlayAgain = () => {
    sound.playClick();
    dispatch(resetGame());
    navigate('/create-room');
  };

  return (
    <div className="min-h-screen bg-budo-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
        {/* Crown & Banner */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-1 shadow-xl shadow-amber-500/40 flex items-center justify-center animate-bounce-subtle">
            <Crown className="w-10 h-10 text-slate-950 fill-slate-950" />
          </div>

          <h2 className="text-2xl font-black text-white">
            {isUserWinner ? '🎉 YOU WIN!' : 'Match Finished!'}
          </h2>
          <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">
            {isUserWinner ? 'Congratulations Champion!' : `${winner?.username || 'Player'} Won the match!`}
          </p>
        </div>

        {/* Points Reward Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-400" />
            <div className="text-left">
              <div className="text-xs font-bold text-white">Rank Points</div>
              <div className="text-[10px] text-slate-400">Competitive Rating</div>
            </div>
          </div>
          <div className="text-base font-black text-emerald-400">
            {isUserWinner ? '+100 PTS' : '+20 PTS'}
          </div>
        </div>

        {/* Podium Standings */}
        {rankings && rankings.length > 0 && (
          <div className="space-y-1.5 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Final Standings
            </div>
            <div className="space-y-1">
              {rankings.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 bg-slate-950 rounded-xl border border-slate-800/80"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${idx === 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-white">{r.username}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {idx === 0 ? '1st Place' : `${idx + 1}th Place`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handlePlayAgain}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <button
            onClick={handleHome}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 active:scale-95 transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
