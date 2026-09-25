import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Landing from './pages/Landing';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import RoomLobby from './pages/RoomLobby';
import JoinRedirect from './pages/JoinRedirect';
import GamePlay from './pages/GamePlay';
import OfflineGame from './pages/OfflineGame';
import Result from './pages/Result';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute({ children }) {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!user) {
    // Save the attempted route so user gets redirected after login
    const returnUrl = location.pathname + location.search;
    if (returnUrl !== '/login' && returnUrl !== '/') {
      sessionStorage.setItem('budo_redirect_after_login', returnUrl);
    }
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="h-full bg-budo-bg text-slate-100 flex flex-col font-sans overflow-hidden">
          <Routes>
          {/* Public Landing Page at Root */}
          <Route path="/" element={<Landing />} />
          
          {/* Auth Pages */}
          <Route path="/splash" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Game Hub & Multiplayer Routes */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/game" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/play" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
          <Route path="/play-options" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
          <Route path="/create-room" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
          <Route path="/join-room" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
          <Route path="/room/:code" element={<ProtectedRoute><RoomLobby /></ProtectedRoute>} />
          <Route path="/join/:code" element={<ProtectedRoute><JoinRedirect /></ProtectedRoute>} />
          <Route path="/game/:code" element={<ProtectedRoute><GamePlay /></ProtectedRoute>} />
          
          {/* Protected Offline Play, Leaderboard & Account Utilities */}
          <Route path="/offline" element={<ProtectedRoute><OfflineGame /></ProtectedRoute>} />
          <Route path="/result" element={<ProtectedRoute><Result /></ProtectedRoute>} />
          <Route path="/rankings" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  </ErrorBoundary>
  );
}
