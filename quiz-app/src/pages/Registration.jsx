import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Nav from '../components/Nav';
import { auth } from '../api';

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function Registration() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [nick, setNick]       = useState('');
  const [pwd, setPwd]         = useState('');
  const [pwd2, setPwd2]       = useState('');
  const [showP, setShowP]     = useState(false);
  const [showP2, setShowP2]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email обязателен';
    if (!nick.trim() || nick.length < 2) e.nick = 'Никнейм минимум 2 символа';
    if (!pwd || pwd.length < 6) e.pwd = 'Пароль минимум 6 символов';
    if (pwd !== pwd2) e.pwd2 = 'Пароли не совпадают';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e_obj = validate();
    if (Object.keys(e_obj).length) { setErrors(e_obj); return; }
    setErrors({});
    setLoading(true);

    try {
      await auth.register(email, nick, pwd);
      navigate('/login');
    } catch (err) {
      setErrors({ api: err.message || 'Ошибка регистрации' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav label="" />
      <div className="page">
        <div className="page__inner">
          <div className="card">
            <h1 className="text-center mb-24">Регистрация</h1>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <span className="field__label">Почта</span>
                <span className="field__icon"><IconMail /></span>
                <input className={`field__input${errors.email ? ' input--error' : ''}`}
                  type="email" placeholder="email@gmail.com"
                  value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }} required />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>

              <div className="field">
                <span className="field__label">Ник</span>
                <span className="field__icon"><IconUser /></span>
                <input className={`field__input${errors.nick ? ' input--error' : ''}`}
                  type="text" placeholder="Ваше имя"
                  value={nick} onChange={e => { setNick(e.target.value); setErrors(p => ({ ...p, nick: '' })); }} required />
                {errors.nick && <p className="field-error">{errors.nick}</p>}
              </div>

              <div className="field">
                <span className="field__label">Пароль</span>
                <span className="field__icon"><IconLock /></span>
                <input className={`field__input${errors.pwd ? ' input--error' : ''}`}
                  type={showP ? 'text' : 'password'} placeholder="Введите пароль"
                  value={pwd} onChange={e => { setPwd(e.target.value); setErrors(p => ({ ...p, pwd: '' })); }} required />
                <button type="button" className="field__icon--right" onClick={() => setShowP(v => !v)}>
                  <IconEye />
                </button>
                {errors.pwd && <p className="field-error">{errors.pwd}</p>}
              </div>

              <div className="field">
                <span className="field__label">Повторите пароль</span>
                <span className="field__icon"><IconLock /></span>
                <input className={`field__input${errors.pwd2 ? ' input--error' : ''}`}
                  type={showP2 ? 'text' : 'password'} placeholder="Введите пароль"
                  value={pwd2} onChange={e => { setPwd2(e.target.value); setErrors(p => ({ ...p, pwd2: '' })); }} required />
                <button type="button" className="field__icon--right" onClick={() => setShowP2(v => !v)}>
                  <IconEye />
                </button>
                {errors.pwd2 && <p className="field-error">{errors.pwd2}</p>}
              </div>

              {errors.api && (
                <div className="form-error">
                  <IconWarn />{errors.api}
                </div>
              )}

              <div className="mt-32">
                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? 'Создаём...' : 'Создать аккаунт'}
                </button>
              </div>
            </form>

            <p className="text-center mt-16" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
              Уже есть аккаунт?{' '}
              <Link to="/login" className="btn btn--ghost">Войдите</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
