import React, { createContext, useContext, useState, useEffect } from 'react';

const QuizContext = createContext(null);

const EMPTY_QUESTION = () => ({
  type: 'text',
  text: '',
  imageUrl: '',
  options: [
    { id: 1, text: '', isCorrect: false },
    { id: 2, text: '', isCorrect: false },
  ],
});

export function QuizProvider({ children }) {
  const [settings, setSettings] = useState({
    name: '',
    timePerQuestion: 30,
    maxParticipants: 30,
    maxQuestions: 10,
    categories: [],
  });

  const [questions, setQuestions]   = useState([EMPTY_QUESTION()]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [session, setSession] = useState(() => {
    const savedSession = localStorage.getItem('quiz_session');
    return savedSession ? JSON.parse(savedSession) : null;
  });
  const [currentQuizId, setCurrentQuizId] = useState(() => {
    return localStorage.getItem('current_quiz_id') || null;
  });
  useEffect(() => {
    if (session) {
      localStorage.setItem('quiz_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('quiz_session');
    }
  }, [session]);
  useEffect(() => {
    if (currentQuizId) {
      localStorage.setItem('current_quiz_id', currentQuizId);
    } else {
      localStorage.removeItem('current_quiz_id');
    }
  }, [currentQuizId]);


  const updateSettings = (patch) =>
    setSettings(prev => ({ ...prev, ...patch }));

  const currentQuestion = questions[currentIdx];

  const updateCurrentQuestion = (patch) =>
    setQuestions(prev =>
      prev.map((q, i) => i === currentIdx ? { ...q, ...patch } : q)
    );

  const addQuestion = () => {
    const next = EMPTY_QUESTION();
    setQuestions(prev => [...prev, next]);
    setCurrentIdx(questions.length);
  };

  const goToQuestion = (idx) => {
    if (idx >= 0 && idx < questions.length) setCurrentIdx(idx);
  };

  // МЕТОД ДЛЯ СИНХРОНИЗАЦИИ ВОПРОСОВ ИЗ БАЗЫ ДАННЫХ
  const setLoadedQuiz = (loadedSettings, loadedQuestions) => {
    setSettings(prev => ({ 
      ...prev, 
      name: loadedSettings.name || '',
      timePerQuestion: loadedSettings.time_per_question ?? loadedSettings.timePerQuestion ?? 30,
      maxParticipants: loadedSettings.max_participants ?? loadedSettings.maxParticipants ?? 30
    }));
    
    const finalQuestions = loadedQuestions && loadedQuestions.length > 0 
      ? loadedQuestions.map(q => ({
          ...q,
          text: q.text || '',
          type: q.type || 'text',
          imageUrl: q.image_url || q.imageUrl || '', 
          options: (q.options || q.answers || []).map(opt => ({
            ...opt,
            text: opt.text || '',
            isCorrect: !!(opt.is_correct ?? opt.isCorrect ?? opt.correct) 
          }))
        }))
      : [EMPTY_QUESTION()];
      
    setQuestions(finalQuestions);
    
    // открываем самый последний сохранённый вопрос
    setCurrentIdx(finalQuestions.length - 1);
  };

  const startSession = async (quizId) => {
    setCurrentQuizId(quizId);
  };

  const joinSession = async (sessionId) => {
    setSession(prev => ({ ...prev, sessionId }));
  };

  const resetQuiz = () => {
    setSettings({
      name: '',
      timePerQuestion: 30,
      maxParticipants: 30,
      maxQuestions: 10,
      categories: [],
    });
    setQuestions([EMPTY_QUESTION()]);
    setCurrentIdx(0);
    setSession(null);
    setCurrentQuizId(null);
  };

  return (
    <QuizContext.Provider value={{
      settings, updateSettings,
      questions, setQuestions,
      currentQuestion, currentIdx,
      updateCurrentQuestion, addQuestion, goToQuestion,
      session, setSession, startSession, joinSession,
      currentQuizId, setCurrentQuizId,
      setLoadedQuiz, 
      resetQuiz,
      totalQuestions: questions.length,
    }}>
      {children}
    </QuizContext.Provider>
  );
}

export const useQuiz = () => {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error('useQuiz must be inside QuizProvider');
  return ctx;
};