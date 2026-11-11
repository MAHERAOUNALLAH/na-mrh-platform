// ============================================================
// client/src/pages/Login.jsx
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../utils/api';

function Login() {
  // sessionNotice : message laissé par AuthContext quand une session a
  // été révoquée (compte désactivé…) et qu'on a été renvoyé ici.
  const { t } = useTranslation();
  const { login, sessionNotice } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError(null);

    // En cas de refus (401…), apiPost rejette avec le message du
    // serveur, affiché tel quel ci-dessous.
    apiPost('/api/auth/login', null, form)
      .then((data) => {
        login(data.token, data.user);
        navigate('/mon-espace');   // redirection après connexion réussie
      })
      .catch((err) => {
        setError(err.message);
        setSending(false);
      });
  }

  return (
    <section className="page-section">
      <div className="container" style={{ maxWidth: '420px' }}>
        <div className="section-head">
          <span className="kicker">{t('auth.kicker')}</span>
          <h2>{t('auth.title')}</h2>
        </div>

        {sessionNotice && (
          <div className="notice-box" role="alert">
            <span aria-hidden="true">⚠</span>
            <span>{t(sessionNotice)}</span>
          </div>
        )}

        <div className="login-card" style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login-email">{t('auth.emailL')}</label>
              <input id="login-email" type="email" name="email" value={form.email} onChange={handleChange} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="login-password">{t('auth.passwordL')}</label>
              <input id="login-password" type="password" name="password" value={form.password} onChange={handleChange} required />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={sending}
            >
              {sending ? '…' : t('auth.submit')}
            </button>

            {error && (
              <p style={{ color: 'red', marginTop: '10px', fontSize: '13.5px' }}>{error}</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

export default Login;