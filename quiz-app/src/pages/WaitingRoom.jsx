import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { useQuiz } from '../context/QuizContext';
import { sessions, quizzes as quizzesApi } from '../api';
import { io } from 'socket.io-client';
import '../styles/WaitingRoom.css'

const initials = (name) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const AV_COLORS = ['#EFB8C8', '#82DA8B', '#b8d8f8', '#f8e4b8', '#f8b8d8'];

export default function WaitingRoom() {
  const navigate = useNavigate();
  const { session, setSession, currentQuizId, setLoadedQuiz } = useQuiz();

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);

  const code = session?.code || '———';

  useEffect(() => {
    if (session?.id || !currentQuizId) return;
    sessions.start(currentQuizId)
      .then(data => {
        setSession({ ...data, sessionId: data.id });
      })
      .catch(console.error);
  }, [currentQuizId, session?.id]);

  useEffect(() => {
    if (!session?.id) return;
    sessions.participants(session.id)
      .then(data => setParticipants(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [session?.id]);

  // Живое обновление списка участников через Socket.IO
  useEffect(() => {
    if (!session?.id) return;

    const socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling'],
    });

    socket.emit('join_room', { sessionId: session.id, userNick: 'Организатор' });

    socket.on('participants_update', (updatedList) => {
      setParticipants(Array.isArray(updatedList) ? updatedList : []);
    });

    return () => socket.disconnect();
  }, [session?.id]);

  const handleStart = async () => {
    if (!session?.id) return;
    setLoading(true);
    try {
      await sessions.startQuiz(session.id);

      if (currentQuizId) {
        const quizData = await quizzesApi.getQuiz(currentQuizId);
        const loadedQuestions = (quizData.questions || []).map(q => ({
          id: q.id,
          type: q.type,
          text: q.text,
          imageUrl: q.imageUrl || q.image_url || '',
          options: (q.options || []).map(o => ({
            id: o.id,
            text: o.text,
            imageUrl:  o.imageUrl  || o.image_url  || '',
            isCorrect: o.isCorrect ?? !!o.is_correct,
          })),
        }));
        setLoadedQuiz(
          { timePerQuestion: quizData.time_per_question || 30 },
          loadedQuestions
        );
      }

      navigate('/quiz/live');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav label="" />
      <div className="page">
        <div className="page__inner page__inner--wide">
          <div className="card">
            <div className="room-code-block">
              <p className="room-code-block__label">Код для подключения</p>
              <p className="room-code-block__code">{code}</p>
            </div>

            <div className="participants-box">
              <div className="participants-box__header">
                Участники — {participants.length}
              </div>
              {participants.length === 0 ? (
                <p>Пока никто не подключился...</p>
              ) : (
                <div className="participants-grid">
                  {participants.map((p, i) => (
                    <div key={p.id} className="participant-chip">
                      <div className="participant-chip__av" style={{background: AV_COLORS[i % AV_COLORS.length]}}>
                        {initials(p.name || p.nick || '?')}
                      </div>
                      {p.nick || p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn--primary" onClick={handleStart} disabled={loading}>
              {loading ? 'Запуск...' : '▶ Начать квиз'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}