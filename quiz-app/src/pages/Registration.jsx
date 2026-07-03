import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Nav from '../components/Nav';
import { auth } from '../api';
import { IconMail, IconLock, IconUser, IconEye, IconWarn } from '../components/Icons';


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
