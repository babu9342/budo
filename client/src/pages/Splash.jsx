import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCurrentUser } from '../store/authSlice';
import BudoLogo from '../components/BudoLogo';

export default function Splash() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchCurrentUser());

    const timer = setTimeout(() => {
      navigate('/home');
    }, 1600);

    return () => clearTimeout(timer);
  }, [navigate, dispatch]);

  return (
    <div className="min-h-screen bg-budo-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Glow Backing */}
      <div className="absolute w-72 h-72 rounded-full bg-blue-600/20 blur-3xl pointer-events-none"></div>
      <div className="absolute w-64 h-64 rounded-full bg-amber-500/15 blur-3xl translate-y-20 pointer-events-none"></div>

      <div className="flex flex-col items-center space-y-6 z-10 animate-fade-in">
        <BudoLogo size="xl" subtitle={true} />

        <div className="flex items-center gap-1.5 pt-8">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.6s]"></span>
        </div>
      </div>
    </div>
  );
}
