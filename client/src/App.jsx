import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

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

function ProtectedRoute({ children }) {
  const { user } = useSelector((state) => state.auth);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <div className="h-full bg-budo-bg text-slate-100 flex flex-col font-sans overflow-hidden">
        <Routes>
          <Route path="/splash" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Main App Routes */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/play-options" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/create-room" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
          <Route path="/join-room" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
          <Route path="/room/:code" element={<ProtectedRoute><RoomLobby /></ProtectedRoute>} />
          <Route path="/join/:code" element={<JoinRedirect />} />
          <Route path="/game/:code" element={<ProtectedRoute><GamePlay /></ProtectedRoute>} />
          <Route path="/offline" element={<OfflineGame />} />
          <Route path="/result" element={<ProtectedRoute><Result /></ProtectedRoute>} />
          <Route path="/rankings" element={<Leaderboard />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
