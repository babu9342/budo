import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const Landing = lazy(() => import('./pages/Landing'));
const Home = lazy(() => import('./pages/Home'));
const CreateRoom = lazy(() => import('./pages/CreateRoom'));
const JoinRoom = lazy(() => import('./pages/JoinRoom'));
const RoomLobby = lazy(() => import('./pages/RoomLobby'));
const JoinRedirect = lazy(() => import('./pages/JoinRedirect'));
const GamePlay = lazy(() => import('./pages/GamePlay'));
const OfflineGame = lazy(() => import('./pages/OfflineGame'));
const Result = lazy(() => import('./pages/Result'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

import ErrorBoundary from './components/ErrorBoundary';

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="h-full bg-budo-bg text-slate-100 flex flex-col font-sans overflow-hidden">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Landing Page at Root */}
              <Route path="/" element={<Landing />} />

              {/* Direct Game Hub & Multiplayer Routes */}
              <Route path="/home" element={<Home />} />
              <Route path="/game" element={<Home />} />
              <Route path="/play" element={<CreateRoom />} />
              <Route path="/play-options" element={<CreateRoom />} />
              <Route path="/create-room" element={<CreateRoom />} />
              <Route path="/join-room" element={<JoinRoom />} />
              <Route path="/room/:code" element={<RoomLobby />} />
              <Route path="/join/:code" element={<JoinRedirect />} />
              <Route path="/game/:code" element={<GamePlay />} />

              {/* Direct Offline Play, Leaderboard & Account Utilities */}
              <Route path="/offline" element={<OfflineGame />} />
              <Route path="/result" element={<Result />} />
              <Route path="/rankings" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
}
