import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { useQuiz } from '../context/QuizContext';
import { questions as questionsApi, quizzes as quizzesApi } from '../api';
import { IconCheck , IconCamera, IconX, IconWarn } from '../components/Icons';


const MAX_OPTIONS = 4;

const emptyOptions = () => [
  { id: 1, text: '', correct: false },
  { id: 2, text: '', correct: false },
];

/* вспомогательный компонент: превью изображения */
function ImagePreview({ url, onRemove, style = {} }) {
  if (!url) return null;
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <img
        src={url}
        alt=""
        style={{
          maxHeight: 120,
          maxWidth: '100%',
          borderRadius: 6,
          objectFit: 'cover',
          border: '1px solid var(--color-border)',
          display: 'block',
        }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      <button
        type="button"
        onClick={onRemove}
        style={{
          position: 'absolute', top: 4, right: 4,
          background: 'rgba(0,0,0,0.55)', border: 'none',
          borderRadius: '50%', width: 22, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff',
        }}
        title="Удалить изображение"
      >
        <IconX />
      </button>
    </div>
  );
}

export default function QuizEditor() {
  const navigate = useNavigate();
  
  const { currentIdx, currentQuestion, updateCurrentQuestion, 
    addQuestion, goToQuestion, settings, currentQuizId } = useQuiz();

  // 'text' = одиночный выбор, 'multi' = множественный
  const [type,             setType]             = useState('text');
  const [qText,            setQText]            = useState('');
  const [qImageUrl,        setQImageUrl]        = useState('');
  const [showQImg,         setShowQImg]         = useState(false);   // раскрыт блок фото вопроса
  const [options,          setOptions]          = useState(emptyOptions());
  const [expandedOptImg,   setExpandedOptImg]   = useState(null);    // id опции с раскрытым полем фото
  const [newOpt,           setNewOpt]           = useState('');
  const [errors,           setErrors]           = useState({});
  const [saving,           setSaving]           = useState(false);

  const maxQ = settings.maxQuestions || 99;

  useEffect(() => {
    if (!currentQuestion) return;

    if (qText === currentQuestion.text && options.length === (currentQuestion.options?.length || 0)) {
      return;
    }

    setType(currentQuestion.type || 'text');
    setQText(currentQuestion.text || '');
    setQImageUrl(currentQuestion.imageUrl || '');
    setShowQImg(!!(currentQuestion.imageUrl));

    const mappedOptions = (currentQuestion.options || []).map(o => ({
      id: o.id,
      text: o.text || '',
      imageUrl: o.imageUrl || '',
      correct: !!(o.isCorrect ?? o.is_correct ?? o.correct) 
    }));
          
    setOptions(mappedOptions.length > 0 ? mappedOptions : emptyOptions());
  }, [currentQuestion]); 

  

  const toggleCorrect = (id) => {
    if (type === 'multi') {
      setOptions(prev => prev.map(o => o.id === id ? { ...o, correct: !o.correct } : o));
    } else {
      setOptions(prev => prev.map(o => ({ ...o, correct: o.id === id })));
    }
  };

  const updateOptText = (id, text) =>
    setOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));

  const updateOptImage = (id, imageUrl) =>
    setOptions(prev => prev.map(o => o.id === id ? { ...o, imageUrl } : o));

  const addOption = () => {
    if (!newOpt.trim()) return;
    if (options.length >= MAX_OPTIONS) return; // лимит 4 варианта
    setOptions(prev => [...prev, { id: Date.now(), text: newOpt.trim(), imageUrl: '', correct: false }]);
    setNewOpt('');
    setErrors(p => ({ ...p, options: '' }));
  };

  const validate = () => {
    const e = {};

    if (!(qText || '').trim() && !(qImageUrl || '').trim())
      e.qText = 'Добавьте текст или изображение вопроса';

    const filled = options.filter(o => (o.text || '').trim() !== '' || (o.imageUrl || '').trim() !== '');

    if (filled.length < 2) e.options = 'Добавьте минимум 2 варианта ответа';
    else if (!options.some(o => o.correct)) e.options = 'Отметьте правильный ответ';

    return e;
  };

  const saveQuestion = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return false; }
    setErrors({});

    const payload = {
      type,
      text:     qText.trim(),
      imageUrl: qImageUrl.trim(),
      options:  options
        .filter(o => o.text.trim() || o.imageUrl.trim())
        .map(o => ({
          text:      o.text,
          imageUrl:  o.imageUrl,
          isCorrect: o.correct,
        })),
    };

    setSaving(true);
    try {
      const isExisting = !!currentQuestion?.id;

      if (isExisting) {
        await questionsApi.update(currentQuizId, currentQuestion.id, payload);
        updateCurrentQuestion({ ...payload, id: currentQuestion.id });
      } else {
        const saved = await questionsApi.create(currentQuizId, payload);
        updateCurrentQuestion(saved || payload);
      }
      return true;
    } catch (err) {
      console.error('Ошибка сохранения вопроса:', err);
      setErrors({ api: err.message || 'Не удалось сохранить вопрос' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePrev = async () => {
  const ok = await saveQuestion();
  if (!ok) return;

  if (currentIdx > 0) {
    goToQuestion(currentIdx - 1);
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
    
  };

  const handleFinish = async () => {
    const ok = await saveQuestion();
    if (!ok) return;
    navigate('/quiz/waiting-room');
  };

  const handleDelete = async () => {
    if (!window.confirm('Вы действительно хотите удалить этот квиз?')) {
      return;
    }

    setSaving(true);
    try {
      await quizzesApi.delete(currentQuizId);
      navigate('/dashboard'); 
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Не удалось удалить квиз: ' + (err.response?.data?.message || err.message));
      setSaving(false);
    }
  };

  const isLastQuestion = currentIdx + 1 >= maxQ;
  const pillStyle = (active) => ({
    padding: '6px 18px',
    borderRadius: 20,
    border: '1px solid var(--color-border)',
    background:  active ? 'var(--color-pink-dark)' : 'transparent',
    color:       active ? '#fff' : 'var(--color-text)',
    fontWeight:  active ? 'var(--fw-semibold)' : 'var(--fw-regular)',
    cursor: 'pointer',
    fontSize: 'var(--fs-body)',
    transition: 'all 0.15s',
  });

  const imgBtnStyle = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '4px 10px',
    border: '1px dashed var(--color-border)',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--color-muted)',
    cursor: 'pointer',
    fontSize: 'var(--fs-small)',
  };

  return (
    <>
      <Nav label="" />
      <div className="page">
        <div className="page__inner">
          <div className="card">

            <h1 className="text-center mb-8">Вопрос {currentIdx + 1}</h1>
            <p className="text-center text-muted mb-24">Максимум вопросов: {maxQ}</p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              <button type="button" style={pillStyle(type === 'text')}
                onClick={() => setType('text')}>
                ◉ Один ответ
              </button>
              <button type="button" style={pillStyle(type === 'multi')}
                onClick={() => setType('multi')}>
                ☑ Несколько ответов
              </button>
            </div>

            <div className="mb-16">
              <p className="mb-8" style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-semibold)' }}>
                Вопрос
              </p>

              <textarea
                className={`input${errors.qText ? ' input--error' : ''}`}
                rows={2}
                placeholder="Введите текст вопроса"
                value={qText}
                onChange={e => { setQText(e.target.value); setErrors(p => ({ ...p, qText: '' })); }}
              />

              <div style={{ marginTop: 8 }}>
                {qImageUrl ? (
                  <ImagePreview url={qImageUrl} onRemove={() => { setQImageUrl(''); setShowQImg(false); }} />
                ) : showQImg ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="input"
                      style={{ flex: 1, fontSize: 'var(--fs-small)' }}
                      placeholder="URL изображения к вопросу..."
                      value={qImageUrl}
                      onChange={e => setQImageUrl(e.target.value)}
                      autoFocus
                    />
                    <button type="button" style={imgBtnStyle}
                      onClick={() => setShowQImg(false)}>
                      <IconX /> Отмена
                    </button>
                  </div>
                ) : (
                  <button type="button" style={imgBtnStyle}
                    onClick={() => setShowQImg(true)}>
                    <IconCamera /> Добавить изображение к вопросу
                  </button>
                )}
              </div>

              {errors.qText && <p className="field-error" style={{ marginTop: 4 }}>{errors.qText}</p>}
            </div>

            <div className="mb-24">
              <p className="mb-8" style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-semibold)' }}>
                Варианты ответа
                <span style={{ fontSize: 'var(--fs-small)', color: 'var(--color-muted)', marginLeft: 8, fontWeight: 'var(--fw-regular)' }}>
                  {type === 'multi' ? '(нажмите для выбора нескольких правильных)' : '(нажмите для выбора правильного)'}
                </span>
              </p>

              <div className="answers">
                {options.map(opt => (
                  <div key={opt.id} style={{ marginBottom: 6 }}>
                    
                    <div
                      className={`answer${opt.correct ? ' answer--correct' : ''}${errors.options ? ' input--error' : ''}`}
                      onClick={() => toggleCorrect(opt.id)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && toggleCorrect(opt.id)}
                      style={{ marginBottom: 0 }}
                    >
                      <div className="answer__radio" />
                      <input
                        className="answer__text"
                        style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 'var(--fs-body)', color: 'var(--color-text)', flex: 1 }}
                        placeholder={`Вариант ${options.indexOf(opt) + 1}`}
                        value={opt.text}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { e.stopPropagation(); updateOptText(opt.id, e.target.value); setErrors(p => ({ ...p, options: '' })); }}
                      />
                      {opt.correct && <IconCheck />}

                    
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setExpandedOptImg(prev => prev === opt.id ? null : opt.id);
                        }}
                        style={{
                          ...imgBtnStyle,
                          border: 'none',
                          color: opt.imageUrl ? 'var(--color-pink-dark)' : 'var(--color-muted)',
                          padding: '2px 6px',
                          marginLeft: 4,
                        }}
                        title="Добавить фото к варианту"
                      >
                        <IconCamera />
                      </button>
                    </div>

                    {(expandedOptImg === opt.id || opt.imageUrl) && (
                      <div style={{ paddingLeft: 36, marginTop: 4 }}>
                        {opt.imageUrl ? (
                          <ImagePreview
                            url={opt.imageUrl}
                            onRemove={() => { updateOptImage(opt.id, ''); setExpandedOptImg(null); }}
                            style={{ marginTop: 0 }}
                          />
                        ) : expandedOptImg === opt.id ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              className="input"
                              style={{ flex: 1, fontSize: 'var(--fs-small)' }}
                              placeholder="URL изображения варианта..."
                              onClick={e => e.stopPropagation()}
                              onChange={e => updateOptImage(opt.id, e.target.value)}
                              autoFocus
                            />
                            <button type="button" style={imgBtnStyle}
                              onClick={() => setExpandedOptImg(null)}>
                              <IconX />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}

               
                {options.length < MAX_OPTIONS ? (
                  <div className="flex gap-8" style={{ marginTop: 4 }}>
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
                    Достигнут максимум вариантов ({MAX_OPTIONS})
                  </p>
                )}
              </div>
              {errors.options && <p className="field-error mt-4">{errors.options}</p>}
            </div>

            {errors.api && (
              <div className="form-error mb-16">
                <IconWarn />{errors.api}
              </div>
            )}

            <div className="flex-col gap-12">
              {currentIdx > 0 && (
                <button 
                  
                  className="btn btn--primary" 
                  onClick={handlePrev} 
                  disabled={saving}
                  style={{ marginBottom: '8px' }} 
                >
                  ← Предыдущий вопрос
                </button>
              )}
              {!isLastQuestion ? (
                <button className="btn btn--primary" onClick={handleNext} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Следующий вопрос →'}
                </button>
              ) : (
                <p className="text-center text-muted" style={{ fontSize: 'var(--fs-small)' }}>
                  Достигнут максимум вопросов ({maxQ})
                </p>
              )}
              <button className="btn btn--secondary" onClick={handleFinish} disabled={saving}>
                {saving ? 'Сохранение...' : 'Закончить квиз'}
              </button>
              <button 
                className="btn" 
                onClick={handleDelete} 
                disabled={saving}
                style={{ background: 'transparent', color: '#ea4335', borderColor: '#ea4335', marginTop: '10px' }}
              >
                {saving ? 'Удаление...' : 'Удалить квиз'}
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