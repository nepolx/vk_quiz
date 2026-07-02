import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { useQuiz } from '../context/QuizContext';
import { questions as questionsApi } from '../api';

const IconText = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 6.1H3M21 12.1H3M15.1 18H3"/>
  </svg>
);
const IconPhoto = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);
const IconMulti = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);
const IconWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const TYPES = [
  { key: 'text',  label: 'Текст', Icon: IconText },
  { key: 'photo', label: 'Фото',  Icon: IconPhoto },
  { key: 'multi', label: 'Мульти', Icon: IconMulti },
];

const MAX_OPTIONS = 4;

const emptyOptions = () => [
  { id: 1, text: '', correct: false },
  { id: 2, text: '', correct: false },
];

export default function QuizEditor() {
  const navigate = useNavigate();
  
  const { currentIdx, currentQuestion, updateCurrentQuestion, addQuestion, settings } = useQuiz();

  const [type, setType]       = useState('text');
  const [qText, setQText]     = useState('');
  const [options, setOptions] = useState(emptyOptions());
  const [newOpt, setNewOpt]   = useState('');
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);

  const { currentQuizId } = useQuiz();

  React.useEffect(() => {
    if (currentQuestion) {
      setQText(currentQuestion.text || '');
      setType(currentQuestion.type || 'text');
      
      const mappedOptions = (currentQuestion.options || []).map(o => ({
        id: o.id,
        text: o.text || '',
        correct: !!(o.isCorrect ?? o.is_correct ?? o.correct) 
      }));
      
      setOptions(mappedOptions.length > 0 ? mappedOptions : emptyOptions());
    }
  }, [currentQuestion]);

  const maxQ = settings.maxQuestions || 99;

  const toggleCorrect = (id) => {
    if (type === 'multi') {
      setOptions(prev => prev.map(o => o.id === id ? { ...o, correct: !o.correct } : o));
    } else {
      setOptions(prev => prev.map(o => ({ ...o, correct: o.id === id })));
    }
  };

  const updateOptText = (id, text) =>
    setOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));

  const addOption = () => {
    if (!newOpt.trim()) return;
    if (options.length >= MAX_OPTIONS) return; // лимит 4 варианта
    setOptions(prev => [...prev, { id: Date.now(), text: newOpt.trim(), correct: false }]);
    setNewOpt('');
    setErrors(p => ({ ...p, options: '' }));
  };

  const validate = () => {
    const e = {};
    if (!qText.trim()) e.qText = 'Введите текст вопроса';

    const filledOptions = options.filter(o => o.text.trim());
    if (filledOptions.length < 2) e.options = 'Добавьте минимум 2 варианта ответа';
    else if (!options.some(o => o.correct)) e.options = 'Отметьте правильный ответ';

    return e;
  };

  const saveQuestion = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return false; }
    setErrors({});

    const q = { type, text: qText.trim(), options: options.filter(o => o.text.trim()).map(o => ({
      text: o.text,
      isCorrect: o.correct
    })) };

    setSaving(true);

    try {
      const savedQuestion = await questionsApi.create(currentQuizId, q);  
      updateCurrentQuestion(savedQuestion || q);
      return true;
    } catch (err) {
      console.error('Ошибка сохранения вопроса:', err);
      setErrors({ api: err.message || 'Не удалось сохранить вопрос' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const ok = await saveQuestion();
    if (!ok) return;

    if (currentIdx + 1 >= maxQ) {
      navigate('/quiz/waiting-room');
      return;
    }

    addQuestion();

    setType('text');
    setQText('');
    setOptions(emptyOptions());
    setNewOpt('');
  };

  const handleFinish = async () => {
    const ok = await saveQuestion();
    if (!ok) return;
    navigate('/quiz/waiting-room');
  };

  const isLastQuestion = currentIdx + 1 >= maxQ;

  return (
    <>
      <Nav label="" />
      <div className="page">
        <div className="page__inner">
          <div className="card">
            <h1 className="text-center mb-8">Вопрос {currentIdx + 1}</h1>
            <p className="text-center text-muted mb-24">
              Максимум вопросов: {maxQ}
            </p>

            {/* Тип вопроса */}
            <div className="q-types">
              {TYPES.map(({ key, label, Icon }) => (
                <button key={key} type="button"
                  className={`q-type${type === key ? ' q-type--active' : ''}`}
                  onClick={() => setType(key)}>
                  <Icon />{label}
                </button>
              ))}
            </div>

            {/* Текст вопроса */}
            <div className="mb-20">
              <p className="mb-8" style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-semibold)' }}>
                Вопрос <span style={{ color: 'var(--color-error)' }}>*</span>
              </p>
              <textarea
                className={`input${errors.qText ? ' input--error' : ''}`}
                rows={2}
                placeholder="Введите текст вопроса"
                value={qText}
                onChange={e => { setQText(e.target.value); setErrors(p => ({ ...p, qText: '' })); }}
              />
              {errors.qText && <p className="field-error">{errors.qText}</p>}
            </div>

            {/* Варианты ответа */}
            <div className="mb-24">
              <p className="mb-8" style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-semibold)' }}>
                Варианты ответа <span style={{ color: 'var(--color-error)' }}>*</span>
                <span style={{ fontSize: 'var(--fs-small)', color: 'var(--color-muted)', marginLeft: 8, fontWeight: 'var(--fw-regular)' }}>
                  {type === 'multi' ? '(можно несколько правильных)' : '(нажмите для выбора правильного)'}
                </span>
              </p>
              <div className="answers">
                {options.map(opt => (
                  <div key={opt.id}
                    className={`answer${opt.correct ? ' answer--correct' : ''}${errors.options ? ' input--error' : ''}`}
                    onClick={() => toggleCorrect(opt.id)}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && toggleCorrect(opt.id)}>
                    <div className="answer__radio" />
                    <input
                      className="answer__text"
                      style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 'var(--fs-body)', color: 'var(--color-text)' }}
                      placeholder={`Вариант ${options.indexOf(opt) + 1}`}
                      value={opt.text}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); updateOptText(opt.id, e.target.value); setErrors(p => ({ ...p, options: '' })); }}
                    />
                    {opt.correct && <IconCheck />}
                  </div>
                ))}

                {options.length < MAX_OPTIONS ? (
                  <div className="flex gap-8">
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      placeholder="Новый вариант..."
                      value={newOpt}
                      onChange={e => setNewOpt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addOption()}
                    />
                    <button type="button" className="btn btn--primary btn--sm btn--auto" onClick={addOption}>
                      + Добавить
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-muted)', margin: '4px 0 0' }}>
                    Достигнут максимум вариантов ответа ({MAX_OPTIONS})
                  </p>
                )}
              </div>
              {errors.options && <p className="field-error mt-4">{errors.options}</p>}
            </div>

            {/* Общая ошибка */}
            {Object.values(errors).some(Boolean) && (
              <div className="form-error mb-16">
                <IconWarn />
                Заполните все обязательные поля перед продолжением
              </div>
            )}

            <div className="flex-col gap-12">
              {!isLastQuestion ? (
                <button className="btn btn--primary" onClick={handleNext} disabled={saving}>
                  Следующий вопрос →
                </button>
              ) : (
                <p className="text-center text-muted" style={{ fontSize: 'var(--fs-small)' }}>
                  Достигнут максимум вопросов ({maxQ})
                </p>
              )}
              <button className="btn btn--secondary" onClick={handleFinish} disabled={saving}>
                Закончить квиз
              </button>
            </div>

            <p className="text-center mt-16 text-muted">
              {currentIdx + 1} из {maxQ} вопросов добавлено
            </p>
          </div>
        </div>
      </div>
    </>
  );
}