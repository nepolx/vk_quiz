import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Nav from '../components/Nav';
import { auth } from '../api';
import { IconMail, IconLock, IconEye, IconWarn } from '../components/Icons';

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
