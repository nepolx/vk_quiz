import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { sessions, auth } from '../api';
import { useQuiz } from '../context/QuizContext';

const IconWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function ParticipantDashboard() {
  const navigate = useNavigate();
  const { setSession } = useQuiz();
  const [code, setCode]       = useState('');
  const [user, setUser]       = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats]     = useState({ totalQuizzes: 0, wins: 0, avgAccuracy: 0 });
  const [codeErr, setCodeErr] = useState('');
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, historyData, statsData] = await Promise.all([
          auth.me(),
          sessions.getHistory(),
          sessions.getStats(),
        ]);

        setUser(userData);

        if (historyData?.history) {
          setHistory(historyData.history);
        }

        setStats({
          totalQuizzes: statsData?.totalQuizzes ?? 0,
          wins:         statsData?.wins         ?? 0,
          avgAccuracy:  statsData?.avgAccuracy  ?? 0,
        });
      } catch (err) {
        console.error('Не удалось загрузить данные', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setCodeErr('Введите код комнаты'); return; }
    if (trimmed.length < 4) { setCodeErr('Код слишком короткий'); return; }
    setCodeErr('');
    setJoining(true);

    try {
      const res = await sessions.join(trimmed, user?.nick);
      setSession({
        ...res,
        participantNick: user?.nick || 'Игрок'
      });
      navigate('/quiz/waiting-room-participant');
    } catch (err) {
      setCodeErr(err.message || 'Не удалось присоединиться. Проверьте код.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <Nav label="" />
      <div className="page page--top">
        <div className="page__inner page__inner--wide">
          <div className="card">
            <h1 className="text-center">Привет,</h1>
            <h1 className="text-center mb-24">{user?.nick || 'Пользователь'}!</h1>

            <div className="stat-trio mb-32">
              <div className="stat-trio__item">
                <span className="stat-trio__num">{stats.totalQuizzes}</span>
                <span className="stat-trio__label">Квизов сыграно</span>
              </div>
              <div className="stat-trio__item">
                <span className="stat-trio__num">{stats.avgAccuracy}%</span>
                <span className="stat-trio__label">Средняя точность</span>
              </div>
              <div className="stat-trio__item">
                <span className="stat-trio__num">{stats.wins}</span>
                <span className="stat-trio__label">Побед</span>
              </div>
            </div>

            <div className="join-box">
              <div className="join-box__icon">🎮</div>
              <p className="join-box__title">Введите код комнаты</p>
              <div className="join-code-row">
                <input
                  className={`input${codeErr ? ' input--error' : ''}`}
                  placeholder="X4-9K7"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setCodeErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  maxLength={8}
                />
                <button
                  className="btn btn--primary btn--auto"
                  style={{ padding: 'var(--sp-12) var(--sp-24)', flexShrink: 0 }}
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? '...' : 'Войти'}
                </button>
              </div>
              {codeErr && (
                <div className="form-error" style={{ marginTop: 'var(--sp-12)', textAlign: 'left' }}>
                  <IconWarn />{codeErr}
                </div>
              )}
            </div>

            <div className="divider" />
            <h3 className="mb-16">История участия</h3>

            {loading ? (
              <p className="text-muted text-center" style={{ padding: 'var(--sp-32) 0' }}>Загрузка...</p>
            ) : history.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: 'var(--sp-32) 0' }}>
                Вы ещё не участвовали ни в одном квизе
              </p>
            ) : (
              <div 
                style={{ 
                  maxHeight: '360px', 
                  overflowY: 'auto',   
                  paddingRight: '8px'  
                }}
              >
              <div className="history-list">
                  {history.map(item => (
                    <div key={`${item.id}-${item.sessionId}`} className="history-item">
                      <div className="history-item__icon">{item.emoji}</div>
                      <div style={{ flexGrow: 1 }}>
                        <div className="history-item__title">{item.title}</div>
                        <div className="history-item__meta">
                          {item.date} · {item.place}-е место из {item.total} · точность {item.accuracy}%
                        </div>
                      </div>
                      <div className="history-item__score">
                        <div className="history-item__pts">{item.pts}</div>
                        <div className="history-item__place">баллов</div>
                      </div>
                    </div>
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