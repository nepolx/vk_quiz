import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api';

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <button 
      onClick={handleLogout}
      className="btn btn--secondary btn--sm"
      style={{
        padding: '6px 14px',
        fontSize: '0.9rem',
        borderRadius: '20px'
      }}
    >
      Выйти
    </button>
  );
}