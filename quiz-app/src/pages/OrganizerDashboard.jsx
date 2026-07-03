import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { quizzes as quizzesApi } from '../api';
import { useQuiz } from '../context/QuizContext';

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const {resetQuiz, prepareForEdit, setCurrentQuizId } = useQuiz();
  
  const [user, setUser]       = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [completedCount, setCompletedCount]       = useState(0);
  const [totalQuizzes, setTotalQuizzes]           = useState(0);

  // История лидербордов
  const [viewMode, setViewMode]           = useState('list'); 
  const [activeQuiz, setActiveQuiz]       = useState(null);
  const [historySessions, setHistorySessions] = useState([]);
  const [currentSessionIdx, setCurrentSessionIdx] = useState(0);
  const [leaderboardPlayers, setLeaderboardPlayers] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError]   = useState('');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);

      const userData = await import('../api').then(m => m.auth.me());
      setUser(userData);

      const data = await quizzesApi.list();
      setQuizzes(data);

      try {
        const statsRes = await import('../api').then(m => m.sessions.getOrganizerStats());
        if (statsRes) {
          setTotalParticipants(statsRes.totalParticipants);
          setCompletedCount(statsRes.completedCount);
          setTotalQuizzes(statsRes.totalQuizzes);
        }
      } catch (e) {
        console.error('Не удалось загрузить статистику', e);
      }

    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizClick = async (quiz) => {
    if (quiz.status === 'draft') {
      // ЧЕРНОВИК
      try {
        setLoading(true);
        
        const data = await quizzesApi.getQuiz(quiz.id); 
        
        prepareForEdit(quiz.id, data, data.questions || []);
        
        navigate('/quiz/editor');
      } catch (err) {
        console.error('Ошибка при загрузке черновика:', err);
        alert('Не удалось загрузить вопросы квиза.');
      } finally {
        setLoading(false);
      }
    } else {
      // ПРОВЕДЕННЫЙ КВИЗ
      setActiveQuiz(quiz);
      setViewMode('history');
      setLoadingHistory(true);
      setHistoryError('');
      setLeaderboardPlayers([]);
      
      try {
        const res = await import('../api').then(m => m.sessions.getQuizSessionHistory(quiz.id));
        setHistorySessions(res || []);
        
        if (res && res.length > 0) {
          setCurrentSessionIdx(0);
          await loadSessionLeaderboard(res[0].id);
        } else {
          setHistoryError('История проведенных игр пуста.');
        }
      } catch (err) {
        console.error(err);
        setHistoryError('Ошибка при загрузке истории сессий.');
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const loadSessionLeaderboard = async (sessionId) => {
    setLoadingHistory(true);
    try {
      const data = await import('../api').then(m => m.sessions.results(sessionId));
      setLeaderboardPlayers(data || []);
    } catch (err) {
      console.error(err);
      setHistoryError('Не удалось загрузить результаты этой сессии.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePrevSession = async () => {
    if (currentSessionIdx < historySessions.length - 1) {
      const nextIdx = currentSessionIdx + 1;
      setCurrentSessionIdx(nextIdx);
      await loadSessionLeaderboard(historySessions[nextIdx].id);
    }
  };

  const handleNextSession = async () => {
    if (currentSessionIdx > 0) {
      const nextIdx = currentSessionIdx - 1;
      setCurrentSessionIdx(nextIdx);
      await loadSessionLeaderboard(historySessions[nextIdx].id);
    }
  };

  const handleEditFromHistory = async () => {
    if (activeQuiz) {
      try {
        setLoading(true);
        
        const data = await quizzesApi.getQuiz(activeQuiz.id);
        
        prepareForEdit(activeQuiz.id, data, data.questions || []);
        
        navigate('/quiz/editor');
      } catch (err) {
        console.error('Ошибка загрузки квиза:', err);
        alert('Не удалось загрузить вопросы квиза.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLaunchAgain = () => {
    if (activeQuiz) {
      resetQuiz();
      setCurrentQuizId(activeQuiz.id);
      navigate('/quiz/waiting-room');
    }
  };

  const handleNew = () => {
    resetQuiz();
    navigate('/quiz/settings');
  };

  return (
    <>
      <Nav label={viewMode === 'history' ? "История лидербордов" : ""} />
      <div className="page page--top">
        <div className="page__inner">
          <div className="card">
            
            <h2 className="text-xl font-bold mb-24 text-center">
              Добро пожаловать, {user?.nick || 'Организатор'}!
            </h2>

            <div className="stats mb-24">
              <div className="stats__pill">
                <span className="stats__num">{totalQuizzes}</span>
                <span className="stats__label">Квизов</span>
              </div>
              <div className="stats__pill">
                <span className="stats__num">{totalParticipants}</span>
                <span className="stats__label">Участников</span>
              </div>
              <div className="stats__pill">
                <span className="stats__num">{completedCount}</span>
                <span className="stats__label">Завершенные</span>
              </div>
            </div>

            <div className="divider" />

            {/* СПИСОК КВИЗОВ */}
            {viewMode === 'list' && (
              <>
                <h3 className="text-center mb-16">Мои квизы</h3>

                {loading ? (
                  <p className="text-muted text-center" style={{ padding: 'var(--sp-32) 0' }}>Загрузка...</p>
                ) : quizzes.length === 0 ? (
                  <p className="text-muted text-center" style={{ padding: 'var(--sp-32) 0' }}>У вас ещё нет квизов</p>
                ) : (
                  <div style={{ maxHeight: '410px', overflowY: 'auto', paddingRight: '8px', paddingBottom: '4px' }}>
                    <div className="quiz-grid">
                      {quizzes.map(q => (
                        <div key={q.id} className="quiz-card" onClick={() => handleQuizClick(q)}>
                          <div className="quiz-card__title">{q.name}</div>
                          <div className="quiz-card__meta">{q.questionsCount || 0} вопросов</div>
                          <span className={`quiz-card__badge ${q.status === 'draft' ? 'badge--draft' : 'badge--completed'}`}>
                            {q.status === 'draft' ? 'Черновик' : 'Завершён'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="divider" />
                <div className="flex justify-center mt-8">
                  <button className="btn btn--primary btn--auto" style={{ padding: 'var(--sp-16) var(--sp-48)' }} onClick={handleNew}>
                    + Новый квиз
                  </button>
                </div>
              </>
            )}

            {/* ИСТОРИЯ ИГР */}
            {viewMode === 'history' && (
              <>
                <div className="flex justify-between items-center mb-16">
                  <button className="btn btn--secondary btn--auto" style={{ padding: '8px 16px' }} onClick={() => setViewMode('list')}>
                    ◀ Назад
                  </button>
                  <h3 className="text-center font-bold" style={{ margin: 0 }}>{activeQuiz?.name}</h3>
                  <div style={{ width: 85 }} />
                </div>

                {loadingHistory ? (
                  <p className="text-muted text-center" style={{ padding: '30px 0' }}>Загрузка результатов...</p>
                ) : historyError ? (
                  <p className="text-danger text-center" style={{ padding: '30px 0' }}>{historyError}</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-24" style={{ background: 'var(--color-bg-alt)', padding: '12px', borderRadius: '12px' }}>
                      <button 
                        className="btn btn--secondary btn--auto" 
                        onClick={handlePrevSession} 
                        disabled={currentSessionIdx === historySessions.length - 1}
                        style={{ padding: '6px 12px' }}
                      >
                        ← Раньше
                      </button>
                      
                      <div className="text-center">
                        <span className="font-bold text-sm block">
                          Игра от {new Date(historySessions[currentSessionIdx]?.created_at || Date.now()).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted">
                          Сессия {historySessions.length - currentSessionIdx} из {historySessions.length}
                        </span>
                      </div>

                      <button 
                        className="btn btn--secondary btn--auto" 
                        onClick={handleNextSession} 
                        disabled={currentSessionIdx === 0}
                        style={{ padding: '6px 12px' }}
                      >
                        Позже →
                      </button>
                    </div>

                    <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '16px' }}>
                      <table className="lb-table">
                        <tbody>
                          {leaderboardPlayers.map(p => (
                            <tr key={p.rank}>
                              <td className="lb__rank">{p.rank}</td>
                              <td style={{ width: 48 }}>
                                <div className="lb__av">{p.initials}</div>
                              </td>
                              <td style={{ fontWeight: 'var(--fw-regular)' }}>{p.name}</td>
                              <td className="lb__pts">
                                {p.pts} баллов
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
                    </div>
                  </>
                )}

                <div className="divider" />
                <div className="flex gap-12 mt-16">
                  <button className="btn btn--secondary" onClick={handleEditFromHistory}>
                    📝 Редактировать квиз
                  </button>
                  <button className="btn btn--primary" onClick={handleLaunchAgain}>
                    🚀 Запустить заново
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}