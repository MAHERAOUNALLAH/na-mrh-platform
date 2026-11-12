// ============================================================
// client/src/pages/secretariat/TwgAdmin.jsx
// Onglet "Groupes de travail" — édition du contenu des GTT :
// noms et descriptions (FR/EN/AR), pays lead et co-lead.
//
// Pas de création ni de suppression : les 5 GTT sont structurels
// (leur id est un slug utilisé dans les URL et les documents).
// Lecture : routes publiques /api/twgs et /api/countries.
// Écriture : PUT /api/admin/twgs/:id (réservé secretariat_admin).
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../../utils/lang';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPut } from '../../utils/api';

function TwgAdmin() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { token } = useAuth();

  const [twgs, setTwgs] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);   // null | id (slug) du GTT édité
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Aucun setState synchrone ici (loading vaut déjà true au premier rendu) :
  // c'est ce que demande la règle ESLint react-hooks/set-state-in-effect.
  // Au rechargement après une sauvegarde, la liste se met à jour sans
  // repasser par l'écran "Chargement…".
  const load = useCallback(() => {
    return Promise.all([apiGet('/api/twgs', token), apiGet('/api/countries', token)])
      .then(([twgData, countryData]) => {
        setTwgs(twgData);
        setCountries(countryData);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function openEdit(twg) {
    setForm({
      nameFr: twg.nameFr, nameEn: twg.nameEn, nameAr: twg.nameAr,
      descFr: twg.descFr || '', descEn: twg.descEn || '', descAr: twg.descAr || '',
      leadCountryId: twg.leadCountryId || '',
      coleadCountryId: twg.coleadCountryId || '',
    });
    setEditing(twg.id);
    setError(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    apiPut(`/api/admin/twgs/${editing}`, token, form)
      .then(() => { setEditing(null); load(); })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <p style={{ fontSize: '14px', color: 'var(--ink-soft)', maxWidth: '58ch', marginBottom: '14px' }}>
        {t('adminTwgs.intro')}
      </p>

      {error && <p className="form-msg form-msg-error" role="alert">{error}</p>}

      {/* Le tableau défile dans son propre cadre : la page ne déborde jamais. */}
      <div className="table-scroll" role="region" aria-label={t('adminTwgs.tableLabel')} tabIndex={0}>
        <table className="admin-table">
          <thead>
            <tr><th>{t('adminTwgs.colTwg')}</th><th>{t('adminTwgs.colLead')}</th><th>{t('adminTwgs.colColead')}</th><th></th></tr>
          </thead>
          <tbody>
            {twgs.map((twg) => (
              <tr key={twg.id}>
                <td><b>{pickLang(twg, 'name', lang)}</b></td>
                <td>{twg.leadCountry ? pickLang(twg.leadCountry, 'name', lang) : '—'}</td>
                <td>{twg.coleadCountry ? pickLang(twg.coleadCountry, 'name', lang) : '—'}</td>
                <td className="cell-actions">
                  <div className="row-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(twg)}>{t('admin.edit')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && form && (
        <div className="admin-form-card">
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>
            {t('adminTwgs.editTitle')}
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="field"><label>{t('admin.inLang', { label: t('adminTwgs.nameL'), lang: t('langNames.fr') })}</label>
              <input type="text" name="nameFr" value={form.nameFr} onChange={handleChange} required /></div>
            <div className="field"><label>{t('admin.inLang', { label: t('adminTwgs.nameL'), lang: t('langNames.en') })}</label>
              <input type="text" name="nameEn" value={form.nameEn} onChange={handleChange} required /></div>
            <div className="field"><label>{t('admin.inLang', { label: t('adminTwgs.nameL'), lang: t('langNames.ar') })}</label>
              <input type="text" name="nameAr" value={form.nameAr} onChange={handleChange} dir="rtl" required /></div>

            <div className="field"><label>{t('admin.inLang', { label: t('adminTwgs.descL'), lang: t('langNames.fr') })}</label>
              <textarea rows="3" name="descFr" value={form.descFr} onChange={handleChange} /></div>
            <div className="field"><label>{t('admin.inLang', { label: t('adminTwgs.descL'), lang: t('langNames.en') })}</label>
              <textarea rows="3" name="descEn" value={form.descEn} onChange={handleChange} /></div>
            <div className="field"><label>{t('admin.inLang', { label: t('adminTwgs.descL'), lang: t('langNames.ar') })}</label>
              <textarea rows="3" name="descAr" value={form.descAr} onChange={handleChange} dir="rtl" /></div>

            <div className="kv-grid" style={{ margin: '0 0 14px' }}>
              <div className="field" style={{ margin: 0 }}><label>{t('adminTwgs.leadL')}</label>
                <select name="leadCountryId" value={form.leadCountryId} onChange={handleChange}>
                  <option value="">{t('admin.noneOption')}</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{pickLang(c, 'name', lang)}</option>)}
                </select></div>
              <div className="field" style={{ margin: 0 }}><label>{t('adminTwgs.coleadL')}</label>
                <select name="coleadCountryId" value={form.coleadCountryId} onChange={handleChange}>
                  <option value="">{t('admin.noneOption')}</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{pickLang(c, 'name', lang)}</option>)}
                </select></div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? '…' : t('admin.save')}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>
                {t('admin.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default TwgAdmin;