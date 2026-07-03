import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { useQuiz } from '../context/QuizContext';
import { sessions } from '../api';
import { io } from 'socket.io-client';

const TILE_CLASSES = ['ans-tile--a', 'ans-tile--b', 'ans-tile--c', 'ans-tile--d'];

export default function LiveQuestion() {
  const navigate = useNavigate();
  const { questions, settings, session } = useQuiz();

  // организатор определяется по отсутствию participantId
  const isOrganizer = !session?.participantId;

  const [qIdx, setQIdx]     = useState(0);
  const [timer, setTimer]   = useState(settings.timePerQuestion || 30);
  const [chosen, setChosen] = useState(null);
  const [answersLog, setAnswersLog] = useState([]);

  const currentQ  = questions[qIdx];
  const totalQ    = questions.length;
  const timeLimit = settings.timePerQuestion || 30;

  const qIdxRef       = useRef(qIdx);
  const totalQRef     = useRef(totalQ);
  const timeLimitRef  = useRef(timeLimit);
  const currentQIdRef = useRef(currentQ?.id);

  useEffect(() => { qIdxRef.current = qIdx; }, [qIdx]);
  useEffect(() => { totalQRef.current = totalQ; }, [totalQ]);
  useEffect(() => { timeLimitRef.current = timeLimit; }, [timeLimit]);
  useEffect(() => { currentQIdRef.current = currentQ?.id; }, [currentQ?.id]);

  const goToIndex = useCallback((nextIdx) => {
    setChosen(null);
    setAnswersLog([]);
    if (nextIdx < totalQRef.current) {
      setQIdx(nextIdx);
      setTimer(timeLimitRef.current);
    } else {
      navigate('/quiz/leaderboard');
    }
  }, [navigate]);

  const localNext = useCallback(() => {
    goToIndex(qIdxRef.current + 1);
  }, [goToIndex]);

  const triggerNextQuestion = useCallback(async () => {
    if (!isOrganizer) return;
    try {
      await sessions.next(session?.sessionId);
    } catch (err) {
      console.error('Ошибка при переключении вопроса организатором:', err);
      localNext();
    }
  }, [isOrganizer, session?.sessionId, localNext]);

  useEffect(() => {
    if (!isOrganizer) return;

    if (timer <= 0) {
      triggerNextQuestion();
      return;
    }

    const intervalId = setInterval(() => {
      setTimer(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timer, isOrganizer, triggerNextQuestion]);

  useEffect(() => {
    if (!session?.sessionId) return;

    const socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling'],
    });

    socket.emit('join_room', { sessionId: session.sessionId });

    socket.on('player_answered', (data) => {
      if (data.questionId === currentQIdRef.current) {
        setAnswersLog(prev => {
          const exists = prev.some(l => l.participantId === data.participantId);
          if (exists) return prev.map(l => (l.participantId === data.participantId ? data : l));
          return [...prev, data];
        });
      }
    });

    socket.on('next_question_triggered', (data) => {
      if (typeof data?.questionIndex === 'number') {
        goToIndex(data.questionIndex);
      } else {
        localNext();
      }
    });

    socket.on('quiz_finished', () => {
      navigate('/quiz/leaderboard');
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.sessionId, goToIndex, localNext, navigate]);

  useEffect(() => {
    if (isOrganizer) return;

    const pInterval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(pInterval);
  }, [isOrganizer, qIdx]);

  const handleAnswer = async (optId) => {
    if (isOrganizer || chosen !== null || timer === 0) return;
    setChosen(optId);

    try {
      await sessions.answer(
        session?.sessionId,
        session?.participantId,
        currentQ?.id,
        optId
      );
    } catch (err) {
      console.error('Ошибка при отправке ответа:', err);
    }
  };

  if (!currentQ) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h3>Ожидание инициализации вопросов...</h3>
      </div>
    );
  }

  const questionText = currentQ.text || `Вопрос ${qIdx + 1}`;
  const options = currentQ.options || [];

  return (
    <>
      <Nav label={isOrganizer ? "Панель Организатора (Управление)" : "Экран Игрока"} />
      <div className="page">
        <div className="page__inner page__inner--wide">
          <div className="card">
            <div className="live">
              <p className="live__qnum">Вопрос {qIdx + 1} из {totalQ}</p>

              <div className={`live__timer${timer <= 5 ? ' live__timer--urgent' : ''}`}>
                {timer}
              </div>

              {currentQ.imageUrl && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img 
                    src={currentQ.imageUrl} 
                    alt="Иллюстрация к вопросу" 
                    style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', objectFit: 'contain' }} 
                  />
                </div>
              )}

              <h2 className="live__question">{questionText}</h2>

              <div className="live__ans-grid">
                {options.slice(0, 4).map((opt, i) => {
                  
                  const isUrlText = opt.text && /^https?:\/\//i.test(opt.text.trim());
                  const showText  = opt.text && !(opt.imageUrl && isUrlText);

                  return (
                    <button
                      key={opt.id || i}
                      type="button"
                      className={[
                        'ans-tile',
                        TILE_CLASSES[i % 4],
                        chosen === opt.id ? 'ans-tile--chosen' : '',
                        chosen !== null && chosen !== opt.id ? 'ans-tile--dim' : '',
                        isOrganizer ? 'ans-tile--disabled' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleAnswer(opt.id)}
                      disabled={isOrganizer || chosen !== null || timer === 0}
                      style={{
                        display:        'flex',
                        flexDirection:  'column',
                        alignItems:     'center',
                        justifyContent: opt.imageUrl ? 'flex-start' : 'center',
                        minHeight:      '140px',
                        padding:        opt.imageUrl ? '8px' : '12px 16px',
                        overflow:       'hidden',
                        boxSizing:      'border-box',
                      }}
                    >
                      {opt.imageUrl && (
                        <div style={{
                          width:    '100%',
                          height:   showText ? '95px' : '120px',
                          flexShrink: 0,
                          marginBottom: showText ? '6px' : 0,
                        }}>
                          <img
                            src={opt.imageUrl}
                            alt=""
                            style={{
                              width:        '100%',
                              height:       '100%',
                              objectFit:    'cover',
                              borderRadius: '6px',
                              display:      'block',
                            }}
                            onError={e => { e.target.parentElement.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      {showText && (
                        <span style={{
                          fontSize:          opt.imageUrl ? '0.82rem' : 'inherit',
                          fontWeight:        opt.imageUrl ? '600' : 'inherit',
                          textAlign:         'center',
                          overflow:          'hidden',
                          display:           '-webkit-box',
                          WebkitLineClamp:   opt.imageUrl ? 2 : 4,
                          WebkitBoxOrient:   'vertical',
                          wordBreak:         'break-word',
                          lineHeight:        '1.3',
                        }}>
                          {opt.text}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="live__count">
                {isOrganizer
                  ? "Игроки отвечают. Ваш таймер управляет комнатой."
                  : chosen !== null
                    ? "Ответ принят. Ждём окончания времени или следующего вопроса от организатора..."
                    : "Выберите правильный вариант"}
              </p>

              {/* ПАНЕЛЬ ОРГАНИЗАТОРА */}
              {isOrganizer && (
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Ответы игроков в реальном времени ({answersLog.length}):</h3>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '8px 16px', background: 'var(--color-pink-dark)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={triggerNextQuestion}
                    >
                      {qIdx + 1 === totalQ ? "Завершить квиз" : "Пропустить вопрос / Далее →"}
                    </button>
                  </div>

                  {answersLog.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>Ожидание ответов участников...</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                      {answersLog.map((log, index) => {
                        const chosenOption = options.find(o => o.id === log.answerId);
                        return (
                          <div
                            key={index}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: log.isCorrect ? '#e6f4ea' : '#fce8e6',
                              borderLeft: `4px solid ${log.isCorrect ? '#34a853' : '#ea4335'}`,
                              fontSize: '0.9rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px'
                            }}
                          >
                            <span>
                              <strong>{log.nick}</strong>
                              {chosenOption ? <>: «{chosenOption.text}»</> : ' ответил(а)'}
                            </span>
                            <span style={{ flexShrink: 0 }}>{log.isCorrect ? '🟢 Верно' : '🔴 Неверно'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 'var(--sp-24)', height: 4, background: 'var(--color-border)', borderRadius: 2 }}>
                <div style={{
                  height: '100%',
                  width: `${((qIdx + 1) / totalQ) * 100}%`,
                  background: 'var(--color-pink-dark)',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }} />
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}