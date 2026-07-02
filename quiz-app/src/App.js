import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { QuizProvider } from './context/QuizContext';

import Login                 from './pages/Login';
import Registration          from './pages/Registration';
import OrganizerDashboard    from './pages/OrganizerDashboard';
import ParticipantDashboard  from './pages/ParticipantDashboard';
import QuizSettings          from './pages/QuizSettings';
import QuizEditor            from './pages/QuizEditor';
import WaitingRoom           from './pages/WaitingRoom';
import LiveQuestion          from './pages/LiveQuestion';
import Leaderboard           from './pages/Leaderboard';
import ParticipantWaitingRoom from './pages/ParticipantWaitingRoom';

export default function App() {
  return (
    <QuizProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                        element={<Navigate to="/login" replace />} />
          <Route path="/login"                   element={<Login />} />
          <Route path="/registration"            element={<Registration />} />
          <Route path="/dashboard"               element={<OrganizerDashboard />} />
          <Route path="/dashboard/participant"   element={<ParticipantDashboard />} />
          <Route path="/quiz/settings"           element={<QuizSettings />} />
          <Route path="/quiz/editor"             element={<QuizEditor />} />
          <Route path="/quiz/waiting-room"       element={<WaitingRoom />} />
          <Route path="/quiz/waiting-room-participant" element={<ParticipantWaitingRoom />} />
          <Route path="/quiz/live"               element={<LiveQuestion />} />
          <Route path="/quiz/leaderboard"        element={<Leaderboard />} />
        </Routes>
      </BrowserRouter>
    </QuizProvider>
  );
}
