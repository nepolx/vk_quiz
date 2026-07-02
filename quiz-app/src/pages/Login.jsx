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
const IconEye = ({ off }) => off ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
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

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('participant');
  const [showPwd, setShowPwd]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e_obj = {};
    if (!email.trim()) e_obj.email = 'Email обязателен';
    if (!password) e_obj.password = 'Пароль обязателен';
    if (Object.keys(e_obj).length) { setErrors(e_obj); return; }
    setErrors({});
    setLoading(true);

    try {
      const data = await auth.login(email, password, role);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', role);
      navigate(role === 'organizer' ? '/dashboard' : '/dashboard/participant');
    } catch (err) {
      setErrors({ api: err.message || 'Неверные учетные данные' });
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
            <h1 className="text-center mb-24">Вход</h1>

            {/* Выбор роли */}
            <div className="role-toggle mb-24">
              <button
                type="button"
                className={`role-toggle__btn${role === 'participant' ? ' role-toggle__btn--active' : ''}`}
                onClick={() => setRole('participant')}
              >
                Участник
              </button>
              <button
                type="button"
                className={`role-toggle__btn${role === 'organizer' ? ' role-toggle__btn--active' : ''}`}
                onClick={() => setRole('organizer')}
              >
                Организатор
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <span className="field__label">Почта</span>
                <span className="field__icon">
                  <IconMail />
                </span>
                <input
                  className={`field__input${errors.email ? ' input--error' : ''}`}
                  type="email"
                  placeholder="email@gmail.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                  required
                />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>

              <div className="field">
                <span className="field__label">Пароль</span>
                <span className="field__icon">
                  <IconLock />
                </span>
                <input
                  className={`field__input${errors.password ? ' input--error' : ''}`}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  required
                />
                <button type="button" className="field__icon--right" onClick={() => setShowPwd(v => !v)}>
                  <IconEye off={showPwd} />
                </button>
                {errors.password && <p className="field-error">{errors.password}</p>}
              </div>

              <div className="text-center mt-8 mb-24" style={{ textAlign: 'right' }}>
                <button type="button" className="btn btn--ghost">Забыли пароль?</button>
              </div>

              {errors.api && (
                <div className="form-error mb-16">
                  <IconWarn />{errors.api}
                </div>
              )}

              <button type="submit" className="btn btn--primary" disabled={loading}>
                {loading ? 'Вход...' : 'Вход'}
              </button>
            </form>

            <p className="text-center mt-16" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
              Нет аккаунта?{' '}
              <Link to="/registration" className="btn btn--ghost">Регистрация</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
