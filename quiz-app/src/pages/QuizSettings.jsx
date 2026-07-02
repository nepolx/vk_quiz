import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import { useQuiz } from '../context/QuizContext';
import { quizzes as quizzesApi } from '../api';

const PRESET_CATS = ['Наука', 'История', 'Технологии', 'Спорт', 'Искусство', 'Музыка', 'Кино', 'Литература'];

const IconWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function QuizSettings() {
  const navigate = useNavigate();
  const { settings, updateSettings, setCurrentQuizId } = useQuiz();

  const [name, setName]             = useState(settings.name);
  const [time, setTime]             = useState(settings.timePerQuestion);
  const [maxParticipants, setMaxParticipants] = useState(settings.maxParticipants);
  const [selected, setSelected]     = useState(settings.categories);

  const [adding, setAdding]           = useState(false);
  const [newCatValue, setNewCatValue] = useState('');
  const [customCats, setCustomCats]   = useState([]);
  const newCatRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const allCats = [...PRESET_CATS, ...customCats];

  const toggleCat = (cat) =>
    setSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const handleAddCat = () => {
    setAdding(true);
    setTimeout(() => newCatRef.current?.focus(), 50);
  };

  const confirmAddCat = () => {
    const val = newCatValue.trim();
    if (val && !allCats.includes(val)) {
      setCustomCats(prev => [...prev, val]);
      setSelected(prev => [...prev, val]);
    }
    setNewCatValue('');
    setAdding(false);
  };

  const validate = () => {
    const e = {};
    if (!name.trim())            e.name = 'Введите название квиза';
    if (!time || Number(time) < 5)  e.time = 'Минимальное время — 5 секунд';
    if (!maxParticipants || Number(maxParticipants) < 1) e.maxParticipants = 'Укажите максимум участников';
    if (Number(maxParticipants) > 100) e.maxParticipants = 'Максимум — 100 участников';
    return e;
  };

  const handleNext = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});

    setCreating(true);
    try {
      const quiz = await quizzesApi.create({
        name: name.trim(),
        timePerQuestion: Number(time),
        maxParticipants: Number(maxParticipants),
        description: selected,
      });

      updateSettings({
        name: name.trim(),
        timePerQuestion: Number(time),
        maxParticipants: Number(maxParticipants),
        categories: selected,
      });

      setCurrentQuizId(quiz.id);
      navigate('/quiz/editor');
    } catch (err) {
      setErrors({ api: err.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Nav label="" />
      <div className="page">
        <div className="page__inner">
          <div className="card">
            <h1 className="text-center mb-32">Настройка квиза</h1>

            <div className="mb-20">
              <p className="mb-8" style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-semibold)' }}>
                Название <span style={{ color: 'var(--color-error)' }}>*</span>
              </p>
              <input
                className={`input${errors.name ? ' input--error' : ''}`}
                placeholder="Введите название квиза"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className="mb-20">
              <p className="mb-8" style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-semibold)' }}>
                Время на вопрос <span style={{ color: 'var(--color-error)' }}>*</span>
              </p>
              <div className="flex items-center gap-12">
                <input
                  className={`input input--inline${errors.time ? ' input--error' : ''}`}
                  style={{ width: 100 }}
                  type="number"
                  min={5} max={300}
                  placeholder="30"
                  value={time}
                  onChange={e => { setTime(e.target.value); setErrors(p => ({ ...p, time: '' })); }}
                />
                <span style={{ fontSize: 'var(--fs-h3)', color: 'var(--color-muted)' }}>сек</span>
              </div>
              {errors.time && <p className="field-error">{errors.time}</p>}
            </div>

            <div className="mb-20">
              <p className="mb-8" style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-semibold)' }}>
                Максимум участников <span style={{ color: 'var(--color-error)' }}>*</span>
              </p>
              <div className="flex items-center gap-12">
                <input
                  className={`input input--inline${errors.maxParticipants ? ' input--error' : ''}`}
                  style={{ width: 100 }}
                  type="number"
                  min={1} max={100}
                  placeholder="30"
                  value={maxParticipants}
                  onChange={e => { setMaxParticipants(e.target.value); setErrors(p => ({ ...p, maxParticipants: '' })); }}
                />
                <span style={{ fontSize: 'var(--fs-h3)', color: 'var(--color-muted)' }}>участников</span>
              </div>
              {errors.maxParticipants && <p className="field-error">{errors.maxParticipants}</p>}
            </div>

            <div className="mb-32">
              <p className="mb-8" style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-semibold)' }}>Категории</p>
              <div className="chips">
                {allCats.map(cat => (
                  <button key={cat} type="button"
                    className={`chip${selected.includes(cat) ? ' chip--active' : ''}`}
                    onClick={() => toggleCat(cat)}>
                    {cat}
                  </button>
                ))}
                {adding ? (
                  <div className="flex items-center gap-8">
                    <input
                      ref={newCatRef}
                      className="input input--inline"
                      style={{ width: 150, padding: '6px 12px' }}
                      placeholder="Название..."
                      value={newCatValue}
                      onChange={e => setNewCatValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmAddCat();
                        if (e.key === 'Escape') { setAdding(false); setNewCatValue(''); }
                      }}
                    />
                    <button type="button" className="btn btn--primary btn--sm btn--auto" onClick={confirmAddCat}>ОК</button>
                  </div>
                ) : (
                  <button type="button" className="chip--add" onClick={handleAddCat}>+ категория</button>
                )}
              </div>
            </div>

            {Object.values(errors).some(Boolean) && (
              <div className="form-error mb-16">
                <IconWarn />
                Пожалуйста, заполните все обязательные поля
              </div>
            )}

            <button className="btn btn--primary" onClick={handleNext} disabled={creating}>
              {creating ? 'Создаём...' : 'Далее →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
