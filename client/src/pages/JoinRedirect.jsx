import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { api } from '../services/api';
import { setRoom } from '../store/roomSlice';
import BudoLogo from '../components/BudoLogo';

export default function JoinRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!code) {
      navigate('/');
      return;
    }

    if (!user) {
      // Save redirect target and send to login
      sessionStorage.setItem('budo_redirect_after_login', `/join/${code}`);
      navigate('/login');
      return;
    }

    // Attempt join
    api.post('/rooms/join', { code })
      .then((res) => {
        if (res.data.success) {
          dispatch(setRoom({ room: res.data.room, isHost: false }));
          if (res.data.isGameActive || res.data.room?.status === 'PLAYING') {
            navigate(`/game/${code}`);
          } else {
            navigate(`/room/${code}`);
          }
        } else {
          navigate('/join-room');
        }
      })
      .catch(() => {
        navigate(`/room/${code}`);
      });
  }, [code, user, navigate, dispatch]);

  return (
    <div className="min-h-screen bg-budo-bg flex flex-col items-center justify-center p-6 space-y-4">
      <BudoLogo size="lg" />
      <div className="text-center">
        <p className="text-sm font-bold text-amber-400">Connecting to Budo Room #{code}...</p>
        <p className="text-xs text-slate-400 mt-1">Preparing your game board...</p>
      </div>
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
