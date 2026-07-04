import React, { useEffect, useState } from 'react';
import '../styles/Leaderboard.css';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { useQuiz } from '../context/QuizContext';
import { sessions } from '../api';

const PODIUM_ORDER = [
  { barClass: 'podium__bar--1', emoji: '🥇' },
  { barClass: 'podium__bar--2', emoji: '🥈' },
  { barClass: 'podium__bar--3', emoji: '🥉' },
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const { session, resetQuiz } = useQuiz();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    // — организатор: WaitingRoom сохраняет { ...data, sessionId: data.id }
    // — участник:    joinSession возвращает { sessionId, ... }
    const sid = session?.sessionId;

    if (!sid) {
      setError('Нет данных о сессии');
      setLoading(false);
      return;
    }

    sessions.results(sid)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPlayers(data);
        } else {
          setError('Нет данных о результатах');
        }
      })
      .catch(err => {
        console.error('Leaderboard fetch error:', err);
        setError('Не удалось загрузить результаты');
      })
      .finally(() => setLoading(false));
  }, [session?.sessionId]);

  const top3 = [players[1], players[0], players[2]].filter(Boolean);

  const handleHome = () => {
    const isParticipant = !!session?.participantId;
    
    resetQuiz();
    
    navigate(isParticipant ? '/dashboard/participant' : '/dashboard');
  };

  return (
    <>
      <Nav label="" />
      <div className="page page--top">
        <div className="page__inner page__inner--wide">
          <div className="card">
            <h1 className="text-center mb-32">Результаты квиза</h1>

            {loading && (
              <p className="text-center text-muted" style={{ padding: 'var(--sp-32) 0' }}>
                Загрузка результатов...
              </p>
            )}

            {!loading && error && (
              <p className="text-center" style={{ padding: 'var(--sp-32) 0', color: 'var(--color-error)' }}>
                {error}
              </p>
            )}

            {!loading && !error && players.length > 0 && (
              <>
                {top3.length >= 1 && (
                  <div className="podium">
                    {top3.map((p, i) => (
                      <div key={p.rank} className="podium__place">
                        <div className={`podium__bar ${PODIUM_ORDER[i].barClass}`}>
                          <span className="podium__emoji">{PODIUM_ORDER[i].emoji}</span>
                        </div>
                        <span className="podium__name">{p.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="divider" />

                <table className="lb-table">
                  <tbody>
                    {players.map(p => (
                      <tr key={p.rank}>
                        <td className="lb__rank">{p.rank}</td>
                        <td style={{ width: 48 }}>
                          <div className="lb__av">{p.initials}</div>
                        </td>
                        <td style={{ fontWeight: 'var(--fw-regular)' }}>
                          {p.name}
                        </td>
                        <td className="lb__pts">
                          {p.pts}
                          {p.accuracy !== undefined && (
                            <span style={{ fontSize: 'var(--fs-small)', color: 'var(--color-muted)', marginLeft: 6 }}>
                              ({p.accuracy}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="flex justify-center mt-32">
              <button
                className="btn btn--primary btn--auto"
                style={{ padding: 'var(--sp-16) var(--sp-48)' }}
                onClick={handleHome}
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}