import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { useQuiz } from '../context/QuizContext';
import { sessions } from '../api';
import { io } from 'socket.io-client';

export default function ParticipantWaitingRoom() {
  const navigate = useNavigate();
  const { session, setLoadedQuiz } = useQuiz();
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.sessionId) {
      navigate('/');
      return;
    }

    async function loadCurrentUsers() {
      try {
        const list = await sessions.participants(session.sessionId);
        setParticipants(list || []);
      } catch (err) {
        console.error("Ошибка загрузки участников:", err);
      }
    }
    loadCurrentUsers();
  }, [session, navigate]);

  useEffect(() => {
    if (!session?.sessionId) return;

    const socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling']
    });

    socket.emit('join_room', { 
      sessionId: session.sessionId,
      userNick: session.participantNick || 'Игрок'
    });

    socket.on('participants_update', (updatedList) => {
      setParticipants(updatedList);
    });

    socket.on('start_quiz', (data) => {
      setLoadedQuiz(
        { timePerQuestion: data.timePerQuestion || 30 },
        data.questions || []
      );
      navigate('/quiz/live');
    });

    socket.on('session_terminated', () => {
      setError('Организатор закрыл комнату.');
      setTimeout(() => navigate('/'), 3000);
    });

    return () => {
      socket.disconnect(); 
    };
  }, [session, navigate, setLoadedQuiz]);

  return (
    <>
      <Nav label="" />
      <div className="page page--top">
        <div className="page__inner">
          <div className="card text-center">
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--sp-16)' }}>⏳</div>
            <h2>Комната ожидания</h2>
            <p className="text-muted mb-24">Организатор скоро запустит квиз. Пожалуйста, подождите.</p>

            {error ? (
              <div className="form-error mb-24">{error}</div>
            ) : (
              <div className="join-box" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <p className="join-box__title" style={{ fontSize: 'var(--fs-medium)', marginBottom: 'var(--sp-12)' }}>
                  Участники в комнате ({participants.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {participants.map((p, idx) => (
                    <span 
                      key={p.id || idx} 
                      className="chip" 
                      style={{ 
                        background: 'var(--color-pink-light)', 
                        color: 'var(--color-pink-dark)', 
                        fontWeight: 'bold',
                        padding: '6px 12px',
                        borderRadius: '20px'
                      }}
                    >
                      👤 {p.nick || p.name || 'Участник'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}