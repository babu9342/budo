import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth } from '../store/authSlice';
import { api } from '../services/api';
import BudoLogo from '../components/BudoLogo';
import BackButton from '../components/BackButton';
import { sound } from '../utils/soundEngine';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    sound.playClick();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        dispatch(setAuth({ user: res.data.user, token: res.data.token }));

        // Check if redirected from a room share link or protected route
        const redirectUrl = sessionStorage.getItem('budo_redirect_after_login');
        if (redirectUrl) {
          sessionStorage.removeItem('budo_redirect_after_login');
          navigate(redirectUrl);
        } else {
          navigate('/game');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login for testing
  const handleQuickDemo = async () => {
    sound.playClick();
    setEmail('player1@budo.com');
    setPassword('budo12345');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: 'Babu',
        email: 'babu@budo.com',
        password: 'password123',
        confirmPassword: 'password123'
      }).catch(async () => {
        return await api.post('/auth/login', { email: 'babu@budo.com', password: 'password123' });
      });

      if (res.data.success) {
        dispatch(setAuth({ user: res.data.user, token: res.data.token }));
        const redirectUrl = sessionStorage.getItem('budo_redirect_after_login');
        if (redirectUrl) {
          sessionStorage.removeItem('budo_redirect_after_login');
          navigate(redirectUrl);
        } else {
          navigate('/game');
        }
      }
    } catch (e) {
      // If demo user exists, login
      try {
        const res2 = await api.post('/auth/login', { email: 'babu@budo.com', password: 'password123' });
        if (res2.data.success) {
          dispatch(setAuth({ user: res2.data.user, token: res2.data.token }));
          navigate('/game');
        }
      } catch (e2) {
        setError('Demo login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-budo-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex items-center justify-start mb-2">
        <BackButton fallback="/" label="Back" />
      </div>

      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <BudoLogo size="lg" subtitle={true} />

        {error && (
          <div className="bg-red-500/15 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-blue-400 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Logging In...' : 'Login'}</span>
          </button>
        </form>

        <button
          onClick={handleQuickDemo}
          type="button"
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <span>⚡ Instant Guest Play (Babu)</span>
        </button>

        <div className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-amber-400 font-bold hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
