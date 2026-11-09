// ============================================================
// client/src/pages/Contact.jsx
// Premier vrai formulaire du projet : deux nouveautés par
// rapport aux pages précédentes :
//   1. Des champs contrôlés (useState suit ce que l'utilisateur tape)
//   2. Un envoi en POST (pas juste une lecture GET)
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';
import Flag from '../components/Flag';

function Contact() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // --- Les pays, pour afficher les contacts de chaque ANR ---
  const [countries, setCountries] = useState([]);
  useEffect(() => {
    fetch('http://localhost:4000/api/countries')
      .then((r) => r.json())
      .then(setCountries)
      .catch((err) => console.error('Erreur de chargement des pays :', err));
  }, []);

  // --- Le formulaire ---
  // Un seul objet d'état pour les 4 champs, plutôt que 4 useState
  // séparés : plus court à écrire, et à mettre à jour un par un
  // via le nom du champ (name="...").
  const [form, setForm] = useState({ name: '', email: '', org: '', message: '' });

  // "idle" | "sending" | "success" | "error" — pour afficher le bon message
  const [status, setStatus] = useState('idle');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();          // empêche le rechargement de page par défaut du navigateur
    setStatus('sending');

    fetch('http://localhost:4000/api/contact', {
      method: 'POST',                                   // GET lisait, POST écrit
      headers: { 'Content-Type': 'application/json' },  // on prévient le serveur : "je t'envoie du JSON"
      body: JSON.stringify(form),                        // on convertit notre objet JS en texte JSON
    })
      .then((r) => {
        if (!r.ok) throw new Error('Échec de l\'envoi');
        return r.json();
      })
      .then(() => {
        setStatus('success');
        setForm({ name: '', email: '', org: '', message: '' });   // on vide le formulaire
      })
      .catch((err) => {
        console.error('Erreur envoi contact :', err);
        setStatus('error');
      });
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('contactPage.kicker')}</span>
          <h2>{t('contactPage.h')}</h2>
          <p>{t('contactPage.p')}</p>
        </div>

        <div className="contact-grid">
          <div>
            <div className="login-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>{t('contactPage.formT')}</h3>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>{t('contactPage.nameL')}</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="field">
                  <label>{t('contactPage.emailL')}</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="field">
                  <label>{t('contactPage.orgL')}</label>
                  <input type="text" name="org" value={form.org} onChange={handleChange} />
                </div>
                <div className="field">
                  <label>{t('contactPage.msgL')}</label>
                  <textarea rows="4" name="message" value={form.message} onChange={handleChange} required />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={status === 'sending'}
                >
                  {status === 'sending' ? '…' : t('contactPage.send')}
                </button>

                {status === 'success' && (
                  <p style={{ color: 'var(--green-deep)', marginTop: '10px', fontSize: '13.5px' }}>
                    {t('contactPage.confirmSent')}
                  </p>
                )}
                {status === 'error' && (
                  <p style={{ color: 'red', marginTop: '10px', fontSize: '13.5px' }}>
                    {t('contactPage.errorSent')}
                  </p>
                )}
              </form>
            </div>

            <div className="kv" style={{ marginTop: '18px' }}>
              <span className="label">{t('contactPage.secT')}</span>
              <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>
                {t('contactPage.secP')}<br />dpm@rns.tn · +216 71 78 31 95
              </span>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>{t('contactPage.nraT')}</h3>
            <div className="nra-contact-list">
              {countries.map((c) => (
                <div key={c.id} className="nra-contact">
                  <Flag code={c.id} width={32} height={22} />
                  <div>
                    <div className="name">{pickLang(c, 'name', lang)}</div>
                    <div className="line">{pickLang(c, 'nraName', lang)}</div>
                    {c.email && <div className="line">{c.email}</div>}
                    {c.phone && <div className="line">{c.phone}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contact;