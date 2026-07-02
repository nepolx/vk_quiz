import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import { useQuiz } from '../context/QuizContext'; 

export default function Nav({ label }) {
  const location = useLocation();
  const { session } = useQuiz();
  
  const showLogout = !['/login', '/registration'].includes(location.pathname);

  const isParticipant = !!session?.participantId || localStorage.getItem('role') === 'participant';
  
  const logoTargetUrl = isParticipant ? '/dashboard/participant' : '/dashboard';

  return (
    <nav className="nav">
      <Link to={logoTargetUrl} className="nav__logo">
        <span className="nav__logo-mark" />
        QuizLive
      </Link>

      {label && <span className="nav__label">{label}</span>}

      {showLogout && (
        <div style={{ marginLeft: 'auto' }}>
          <LogoutButton />
        </div>
      )}
    </nav>
  );
}