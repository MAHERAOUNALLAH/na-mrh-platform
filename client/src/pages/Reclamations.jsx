// ============================================================
// client/src/pages/Reclamations.jsx
// Formulaire de réclamation — même logique que Contact.jsx,
// mais envoyé vers /api/complaints, qui ENREGISTRE vraiment en
// base (contrairement à /api/contact, qui ne fait que logger).
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';
import { apiGet, apiPost } from '../utils/api';

function Reclamations() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [countries, setCountries] = useState([]);
  useEffect(() => {
    apiGet('/api/countries')
      .then(setCountries)
      .catch((err) => console.error('Erreur de chargement des pays :', err));
  }, []);

  const [form, setForm] = useState({ name: '', org: '', countryId: '', nature: 'service', message: '' });
  const [status, setStatus] = useState('idle');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    apiPost('/api/complaints', null, form)
      .then(() => {
        setStatus('success');
        setForm({ name: '', org: '', countryId: '', nature: 'service', message: '' });
      })
      .catch((err) => {
        console.error('Erreur envoi réclamation :', err);
        setStatus('error');
      });
  }

  const natureKeys = ['service', 'delay', 'access', 'other'];

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('complaintsPage.kicker')}</span>
          <h2>{t('complaintsPage.h')}</h2>
          <p>{t('complaintsPage.p')}</p>
        </div>

        <div className="login-card" style={{ padding: '24px', maxWidth: '560px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>{t('complaintsPage.formT')}</h3>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>{t('complaintsPage.nameL')}</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="field">
              <label>{t('complaintsPage.orgL')}</label>
              <input type="text" name="org" value={form.org} onChange={handleChange} />
            </div>
            <div className="field">
              <label>{t('complaintsPage.countryL')}</label>
              <select name="countryId" value={form.countryId} onChange={handleChange}>
                <option value="">—</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{pickLang(c, 'name', lang)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t('complaintsPage.natureL')}</label>
              <select name="nature" value={form.nature} onChange={handleChange}>
                {natureKeys.map((key) => (
                  <option key={key} value={key}>{t(`complaintsPage.natureOptions.${key}`)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t('complaintsPage.messageL')}</label>
              <textarea rows="4" name="message" value={form.message} onChange={handleChange} required />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={status === 'sending'}
            >
              {status === 'sending' ? '…' : t('complaintsPage.send')}
            </button>

            {status === 'success' && (
              <div style={{ marginTop: '14px' }}>
                <p style={{ fontWeight: 700, fontSize: '14px' }}>{t('complaintsPage.confirmT')}</p>
                <p style={{ color: 'var(--ink-soft)', fontSize: '13.5px' }}>{t('complaintsPage.confirmP')}</p>
              </div>
            )}
            {status === 'error' && (
              <p style={{ color: 'red', marginTop: '10px', fontSize: '13.5px' }}>
                {t('complaintsPage.errorSent')}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

export default Reclamations;