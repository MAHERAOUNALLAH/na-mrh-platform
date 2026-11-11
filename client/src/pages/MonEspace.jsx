// ============================================================
// client/src/pages/MonEspace.jsx  (v3)
// Espace personnel : identité, niveau d'accès, accès au Secrétariat
// pour les secretariat_admin, et formulaire « Mon profil » (nom et
// adresse e-mail) — PUT /api/auth/me.
//
// Le niveau, le pays et le statut ne se modifient JAMAIS ici (le serveur
// refuse ces champs). Changer d'e-mail demande le mot de passe actuel.
// Après enregistrement, la session continue (le jeton ne contient que
// l'identifiant) et l'écran se met à jour sans reconnexion.
// ============================================================

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiPut } from '../utils/api';

// Même règle que le serveur (utils/email.js) pour savoir si l'e-mail change.
const normalize = (email) => email.trim().toLowerCase();

function ProfileForm() {
  const { t } = useTranslation();
  const { user, token, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email, currentPassword: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);   // { ok, text }
  const emailChanged = normalize(form.email) !== user.email;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const body = { name: form.name, email: form.email };
    if (emailChanged) body.currentPassword = form.currentPassword;
    apiPut('/api/auth/me', token, body)
      .then((data) => {
        updateUser(data.user);
        setForm({ name: data.user.name, email: data.user.email, currentPassword: '' });
        setStatus({ ok: true, text: t('profile.saved') });
      })
      // Message du serveur (400 / 409…), affiché tel quel.
      .catch((err) => setStatus({ ok: false, text: err.message }))
      .finally(() => setSaving(false));
  }

  return (
    <div className="login-card profile-card">
      <h3>{t('profile.title')}</h3>
      <p className="profile-help">{t('profile.help')}</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="profile-name">{t('profile.nameL')}</label>
          <input id="profile-name" type="text" name="name" autoComplete="name" maxLength={200}
            value={form.name} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="profile-email">{t('profile.emailL')}</label>
          <input id="profile-email" type="email" name="email" autoComplete="email" maxLength={254}
            value={form.email} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="profile-password">{t('profile.currentPasswordL')}</label>
          <input id="profile-password" type="password" name="currentPassword" autoComplete="current-password"
            value={form.currentPassword} onChange={handleChange} required={emailChanged}
            aria-describedby="profile-password-help" />
          <p id="profile-password-help" className="profile-help">
            {emailChanged ? t('profile.passwordNeeded') : t('profile.passwordHint')}
          </p>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '…' : t('profile.save')}
          </button>
        </div>
        {status && (
          <p className={status.ok ? 'form-msg form-msg-ok' : 'form-msg form-msg-error'} role={status.ok ? 'status' : 'alert'}>
            {status.text}
          </p>
        )}
      </form>
    </div>
  );
}

function MonEspace() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const levelLabel = t(`levels.${user.level}`, { defaultValue: user.level });
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('myspace.kicker')}</span>
          <h2>{t('myspace.hello', { name: user.name })}</h2>
          <p>{t('myspace.connectedAs', { level: levelLabel })}</p>
        </div>

        <div className="kv-grid">
          <div className="kv">
            <span className="label">{t('myspace.emailL')}</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}><bdi dir="ltr">{user.email}</bdi></span>
          </div>
          <div className="kv">
            <span className="label">{t('myspace.levelL')}</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {levelLabel}
            </span>
          </div>
        </div>

        {user.level === 'secretariat_admin' && (
          <Link to="/secretariat" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-flex' }}>
            {t('myspace.toSecretariat')}
          </Link>
        )}

        <div style={{ marginTop: '16px' }}>
          <button className="btn btn-outline" onClick={handleLogout}>
            {t('myspace.logout')}
          </button>
        </div>

        <ProfileForm />
      </div>
    </section>
  );
}

export default MonEspace;
