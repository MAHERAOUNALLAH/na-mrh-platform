// ============================================================
// client/src/pages/secretariat/CountryAccounts.jsx
// Onglet "Comptes des pays" — premier écran CRUD complet :
// lister, créer, modifier, supprimer.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { pickLang } from '../../utils/lang';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api';
import Flag from '../../components/Flag';

// Libellés : clés orgRoles.* des locales ('' = aucun rôle).
const ORG_ROLES = ['', 'president', 'vice_president', 'member', 'secretariat', 'other'];

const EMPTY_FORM = {
  id: '', nameFr: '', nameEn: '', nameAr: '',
  nraNameFr: '', nraNameEn: '', nraNameAr: '',
  email: '', phone: '', website: '', orgRole: '', orgRoleOther: '',
};

function CountryAccounts() {
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [countries, setCountries] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // null = formulaire fermé | 'new' = création | 'tn' = modification du pays tn
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // useCallback : évite de recréer la fonction à chaque rendu,
  // ce qui ferait boucler le useEffect qui en dépend.
  // Pas de setLoading(true) ici : cette fonction est appelée par le
  // useEffect, et la règle ESLint react-hooks/set-state-in-effect interdit
  // tout setState synchrone dans un effet (loading vaut déjà true au
  // premier rendu, voir TwgAdmin.jsx). Les rechargements déclenchés par
  // une action passent par reloadCountries(), qui remet l'écran « Chargement… »
  // comme avant : le comportement visible ne change pas.
  const loadCountries = useCallback(() => {
    apiGet('/api/admin/countries', token)
      .then((data) => { setCountries(data); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadCountries(); }, [loadCountries]);

  // Rechargement après une action (enregistrement, suppression).
  function reloadCountries() {
    setLoading(true);
    loadCountries();
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing('new');
  }

  function openEdit(country) {
    setForm({
      id: country.id,
      nameFr: country.nameFr || '', nameEn: country.nameEn || '', nameAr: country.nameAr || '',
      nraNameFr: country.nraNameFr || '', nraNameEn: country.nraNameEn || '', nraNameAr: country.nraNameAr || '',
      email: country.email || '', phone: country.phone || '', website: country.website || '',
      orgRole: country.orgRole || '', orgRoleOther: country.orgRoleOther || '',
    });
    setEditing(country.id);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Création ou modification selon le mode en cours
    const action = editing === 'new'
      ? apiPost('/api/admin/countries', token, form)
      : apiPut(`/api/admin/countries/${editing}`, token, form);

    action
      .then(() => {
        setEditing(null);
        reloadCountries();   // on recharge la liste pour voir le changement
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  function handleDelete(country) {
    const name = pickLang(country, 'name', lang);
    if (!window.confirm(t('adminCountries.confirmDelete', { name }))) return;

    apiDelete(`/api/admin/countries/${country.id}`, token)
      .then(() => reloadCountries())
      .catch((err) => setError(err.message));   // ex. "il est lead d'un GTT"
  }

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <div className="admin-toolbar">
        <p style={{ fontSize: '14px', color: 'var(--ink-soft)', maxWidth: '60ch' }}>
          {t('adminCountries.intro')}
        </p>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>{t('adminCountries.add')}</button>
      </div>

      {error && <p className="form-msg form-msg-error" role="alert">{error}</p>}

      {/* Le tableau défile dans son propre cadre : la page ne déborde jamais. */}
      <div className="table-scroll" role="region" aria-label={t('adminCountries.tableLabel')} tabIndex={0}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('adminCountries.colCountry')}</th>
              <th>{t('adminCountries.colOrgRole')}</th>
              <th>{t('adminCountries.colTwgRoles')}</th>
              <th>{t('adminCountries.colUsers')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="cell-country">
                    <Flag code={c.id} width={26} height={18} />
                    <b>{pickLang(c, 'name', lang)}</b>
                  </div>
                </td>
                <td>
                  {c.orgRole
                    ? (c.orgRole === 'other'
                        ? (c.orgRoleOther || t('orgRoles.other'))
                        : t(`orgRoles.${c.orgRole}`, { defaultValue: c.orgRole }))
                    : '—'}
                </td>
                <td>
                  {c.twgsAsLead.map((w) => (
                    <span key={`l-${w.id}`} className="tag-pill">{t('twgRoles.lead')} · {pickLang(w, 'name', lang)}</span>
                  ))}
                  {c.twgsAsColead.map((w) => (
                    <span key={`c-${w.id}`} className="tag-pill">{t('twgRoles.colead')} · {pickLang(w, 'name', lang)}</span>
                  ))}
                  {c.twgsAsLead.length === 0 && c.twgsAsColead.length === 0 && '—'}
                </td>
                <td>{c._count.users}</td>
                <td className="cell-actions">
                  <div className="row-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>{t('admin.edit')}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(c)}>{t('admin.delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="admin-form-card">
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>
            {editing === 'new' ? t('adminCountries.newTitle') : t('adminCountries.editTitle', { name: pickLang(form, 'name', lang) || form.nameFr })}
          </h3>

          <form onSubmit={handleSubmit}>
            {editing === 'new' && (
              <div className="field">
                <label>{t('adminCountries.codeL')}</label>
                <input type="text" name="id" value={form.id} onChange={handleChange} maxLength="2" required />
              </div>
            )}

            <div className="field"><label>{t('admin.inLang', { label: t('adminCountries.nameL'), lang: t('langNames.fr') })}</label>
              <input type="text" name="nameFr" value={form.nameFr} onChange={handleChange} required /></div>
            <div className="field"><label>{t('admin.inLang', { label: t('adminCountries.nameL'), lang: t('langNames.en') })}</label>
              <input type="text" name="nameEn" value={form.nameEn} onChange={handleChange} required /></div>
            <div className="field"><label>{t('admin.inLang', { label: t('adminCountries.nameL'), lang: t('langNames.ar') })}</label>
              <input type="text" name="nameAr" value={form.nameAr} onChange={handleChange} dir="rtl" required /></div>

            <div className="field"><label>{t('admin.inLang', { label: t('adminCountries.nraL'), lang: t('langNames.fr') })}</label>
              <input type="text" name="nraNameFr" value={form.nraNameFr} onChange={handleChange} /></div>
            <div className="field"><label>{t('admin.inLang', { label: t('adminCountries.nraL'), lang: t('langNames.en') })}</label>
              <input type="text" name="nraNameEn" value={form.nraNameEn} onChange={handleChange} /></div>
            <div className="field"><label>{t('admin.inLang', { label: t('adminCountries.nraL'), lang: t('langNames.ar') })}</label>
              <input type="text" name="nraNameAr" value={form.nraNameAr} onChange={handleChange} dir="rtl" /></div>

            <div className="field"><label>{t('adminCountries.emailL')}</label>
              <input type="text" name="email" value={form.email} onChange={handleChange} /></div>
            <div className="field"><label>{t('adminCountries.phoneL')}</label>
              <input type="text" name="phone" value={form.phone} onChange={handleChange} /></div>
            <div className="field"><label>{t('adminCountries.websiteL')}</label>
              <input type="text" name="website" value={form.website} onChange={handleChange} /></div>

            <div className="field">
              <label>{t('adminCountries.orgRoleL')}</label>
              <select name="orgRole" value={form.orgRole} onChange={handleChange}>
                {ORG_ROLES.map((r) => (
                  <option key={r} value={r}>{r ? t(`orgRoles.${r}`) : '—'}</option>
                ))}
              </select>
            </div>

            {form.orgRole === 'other' && (
              <div className="field">
                <label>{t('adminCountries.orgRoleOtherL')}</label>
                <input type="text" name="orgRoleOther" value={form.orgRoleOther} onChange={handleChange} />
              </div>
            )}

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

      <div className="note-line">
        ℹ️ {t('adminCountries.note')}
      </div>
    </div>
  );
}

export default CountryAccounts;