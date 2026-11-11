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

const ORG_ROLES = [
  { value: '', label: '—' },
  { value: 'president', label: 'Président' },
  { value: 'vice_president', label: 'Vice-président' },
  { value: 'member', label: 'Membre' },
  { value: 'secretariat', label: 'Secrétariat' },
  { value: 'other', label: 'Autre' },
];

const EMPTY_FORM = {
  id: '', nameFr: '', nameEn: '', nameAr: '',
  nraNameFr: '', nraNameEn: '', nraNameAr: '',
  email: '', phone: '', website: '', orgRole: '', orgRoleOther: '',
};

function CountryAccounts() {
  const { token } = useAuth();
  const { i18n } = useTranslation();
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
    if (!window.confirm(`Supprimer définitivement le compte de ${name} ?`)) return;

    apiDelete(`/api/admin/countries/${country.id}`, token)
      .then(() => reloadCountries())
      .catch((err) => setError(err.message));   // ex. "il est lead d'un GTT"
  }

  if (loading) return <p>Chargement…</p>;

  return (
    <div>
      <div className="admin-toolbar">
        <p style={{ fontSize: '14px', color: 'var(--ink-soft)', maxWidth: '60ch' }}>
          Gestion des comptes des États membres : identité, coordonnées de l'ANR,
          et rôle dans l'organisation régionale.
        </p>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Ajouter un pays</button>
      </div>

      {error && (
        <p style={{ color: 'red', fontSize: '13.5px', marginBottom: '12px' }}>{error}</p>
      )}

      {/* Le tableau défile dans son propre cadre : la page ne déborde jamais. */}
      <div className="table-scroll" role="region" aria-label="Comptes des pays" tabIndex={0}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pays</th>
              <th>Rôle dans l'organisation</th>
              <th>Rôles GTT</th>
              <th>Utilisateurs</th>
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
                        ? (c.orgRoleOther || 'Autre')
                        : (ORG_ROLES.find((r) => r.value === c.orgRole)?.label || c.orgRole))
                    : '—'}
                </td>
                <td>
                  {c.twgsAsLead.map((w) => (
                    <span key={`l-${w.id}`} className="tag-pill">Lead · {pickLang(w, 'name', lang)}</span>
                  ))}
                  {c.twgsAsColead.map((w) => (
                    <span key={`c-${w.id}`} className="tag-pill">Co-lead · {pickLang(w, 'name', lang)}</span>
                  ))}
                  {c.twgsAsLead.length === 0 && c.twgsAsColead.length === 0 && '—'}
                </td>
                <td>{c._count.users}</td>
                <td className="cell-actions">
                  <div className="row-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Modifier</button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(c)}>Supprimer</button>
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
            {editing === 'new' ? 'Nouveau pays' : `Modifier — ${form.nameFr}`}
          </h3>

          <form onSubmit={handleSubmit}>
            {editing === 'new' && (
              <div className="field">
                <label>Code pays (2 lettres, ex. sn)</label>
                <input type="text" name="id" value={form.id} onChange={handleChange} maxLength="2" required />
              </div>
            )}

            <div className="field"><label>Nom (Français)</label>
              <input type="text" name="nameFr" value={form.nameFr} onChange={handleChange} required /></div>
            <div className="field"><label>Nom (Anglais)</label>
              <input type="text" name="nameEn" value={form.nameEn} onChange={handleChange} required /></div>
            <div className="field"><label>Nom (Arabe)</label>
              <input type="text" name="nameAr" value={form.nameAr} onChange={handleChange} dir="rtl" required /></div>

            <div className="field"><label>Nom de l'ANR (Français)</label>
              <input type="text" name="nraNameFr" value={form.nraNameFr} onChange={handleChange} /></div>
            <div className="field"><label>Nom de l'ANR (Anglais)</label>
              <input type="text" name="nraNameEn" value={form.nraNameEn} onChange={handleChange} /></div>
            <div className="field"><label>Nom de l'ANR (Arabe)</label>
              <input type="text" name="nraNameAr" value={form.nraNameAr} onChange={handleChange} dir="rtl" /></div>

            <div className="field"><label>Courriel</label>
              <input type="text" name="email" value={form.email} onChange={handleChange} /></div>
            <div className="field"><label>Téléphone</label>
              <input type="text" name="phone" value={form.phone} onChange={handleChange} /></div>
            <div className="field"><label>Site web</label>
              <input type="text" name="website" value={form.website} onChange={handleChange} /></div>

            <div className="field">
              <label>Rôle dans l'organisation</label>
              <select name="orgRole" value={form.orgRole} onChange={handleChange}>
                {ORG_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {form.orgRole === 'other' && (
              <div className="field">
                <label>Précisez le rôle</label>
                <input type="text" name="orgRoleOther" value={form.orgRoleOther} onChange={handleChange} />
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? '…' : 'Enregistrer'}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="note-line">
        ℹ️ Les rôles GTT (lead / co-lead) se gèrent depuis l'onglet Groupes de travail ;
        les utilisateurs de chaque pays depuis l'onglet Gestion des utilisateurs.
      </div>
    </div>
  );
}

export default CountryAccounts;