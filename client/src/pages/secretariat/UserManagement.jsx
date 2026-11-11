// ============================================================
// client/src/pages/secretariat/UserManagement.jsx
// Onglet "Gestion des utilisateurs".
//
// Trois nouveautés par rapport à CountryAccounts :
//   - un filtre par pays (menu déroulant qui recharge la liste)
//   - des cases à cocher multiples (fonctions réglementaires)
//   - activer/désactiver au lieu de supprimer
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { pickLang } from '../../utils/lang';
import { apiGet, apiPost, apiPut, apiPatch } from '../../utils/api';

const LEVELS = [
  { value: 'reader', label: 'Lecteur' },
  { value: 'contributor', label: 'Contributeur' },
  { value: 'validator', label: 'Validateur' },
  { value: 'country_admin', label: 'Administrateur pays' },
  { value: 'secretariat_admin', label: 'Administrateur Secrétariat' },
];

const ORG_ROLES = [
  { value: '', label: '—' },
  { value: 'president', label: 'Président' },
  { value: 'vice_president', label: 'Vice-président' },
  { value: 'member', label: 'Membre' },
  { value: 'secretariat', label: 'Secrétariat' },
  { value: 'other', label: 'Autre' },
];

const selectStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--line-strong)',
  borderRadius: '2px', background: 'var(--bg)', fontFamily: 'inherit', fontSize: '14px',
};

const EMPTY_FORM = {
  name: '', email: '', password: '', level: 'reader',
  countryId: '', orgRole: '', orgRoleOther: '', functions: [],
};

function UserManagement() {
  const { token } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const [users, setUsers] = useState([]);
  const [countries, setCountries] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [filterCountry, setFilterCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);   // null | 'new' | id numérique
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Pas de setLoading(true) ici : cette fonction est appelée par le
  // useEffect, et la règle ESLint react-hooks/set-state-in-effect interdit
  // tout setState synchrone dans un effet (loading vaut déjà true au
  // premier rendu, voir TwgAdmin.jsx). Les rechargements déclenchés par
  // une action passent par reloadUsers() ou changeFilter(), qui remet l'écran « Chargement… »
  // comme avant : le comportement visible ne change pas.
  const loadUsers = useCallback(() => {
    const path = filterCountry
      ? `/api/admin/users?countryId=${filterCountry}`
      : '/api/admin/users';
    apiGet(path, token)
      .then((data) => { setUsers(data); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, filterCountry]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Rechargement après une action (enregistrement, activation).
  function reloadUsers() {
    setLoading(true);
    loadUsers();
  }

  // Changer de pays modifie filterCountry, donc loadUsers, donc relance
  // l'effet : on affiche « Chargement… » dès le clic, comme avant.
  function changeFilter(countryId) {
    setLoading(true);
    setFilterCountry(countryId);
  }

  // Les pays et les fonctions ne changent pas souvent : une seule fois.
  useEffect(() => {
    apiGet('/api/admin/countries', token).then(setCountries).catch(() => {});
    apiGet('/api/admin/functions', token).then(setFunctions).catch(() => {});
  }, [token]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing('new');
  }

  function openEdit(user) {
    setForm({
      name: user.name, email: user.email,
      password: '',                       // vide = on ne change pas le mot de passe
      level: user.level,
      countryId: user.countryId || '',
      orgRole: user.orgRole || '',
      orgRoleOther: user.orgRoleOther || '',
      functions: user.userFunctions.map((f) => f.functionCode),
    });
    setEditing(user.id);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Cases à cocher multiples : on ajoute ou retire le code du tableau
  function toggleFunction(code) {
    setForm((prev) => ({
      ...prev,
      functions: prev.functions.includes(code)
        ? prev.functions.filter((c) => c !== code)
        : [...prev.functions, code],
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const action = editing === 'new'
      ? apiPost('/api/admin/users', token, form)
      : apiPut(`/api/admin/users/${editing}`, token, form);

    action
      .then(() => { setEditing(null); reloadUsers(); })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  function toggleActive(user) {
    const action = user.isActive ? 'désactiver' : 'réactiver';
    if (!window.confirm(`Voulez-vous ${action} le compte de ${user.name} ?`)) return;

    apiPatch(`/api/admin/users/${user.id}/active`, token, { isActive: !user.isActive })
      .then(() => reloadUsers())
      .catch((err) => setError(err.message));
  }

  if (loading) return <p>Chargement…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <p style={{ fontSize: '14px', color: 'var(--ink-soft)', maxWidth: '58ch' }}>
          Utilisateurs internes des Autorités Nationales de Réglementation et du Secrétariat.
        </p>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Ajouter un utilisateur</button>
      </div>

      <div className="field" style={{ maxWidth: '280px' }}>
        <label>Filtrer par pays</label>
        <select value={filterCountry} onChange={(e) => changeFilter(e.target.value)} style={selectStyle}>
          <option value="">Tous les pays</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>{pickLang(c, 'name', lang)}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: 'red', fontSize: '13.5px', marginBottom: '12px' }}>{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Nom</th><th>E-mail</th><th>Pays</th><th>Niveau</th>
            <th>Fonctions</th><th>Rôles GTT</th><th>Statut</th><th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
              <td><b>{u.name}</b></td>
              <td><bdi dir="ltr">{u.email}</bdi></td>
              <td>{u.country ? pickLang(u.country, 'name', lang) : '—'}</td>
              <td>{LEVELS.find((l) => l.value === u.level)?.label || u.level}</td>
              <td>
                {u.userFunctions.length > 0
                  ? u.userFunctions.map((f) => (
                      <span key={f.functionCode} className="tag-pill">{f.functionCode}</span>
                    ))
                  : '—'}
              </td>
              <td>
                {u.twgMemberships.length > 0
                  ? u.twgMemberships.map((m) => (
                      <span key={m.twg.id} className="tag-pill">
                        {m.role} · {pickLang(m.twg, 'name', lang)}
                      </span>
                    ))
                  : '—'}
              </td>
              <td>{u.isActive ? 'Actif' : 'Désactivé'}</td>
              <td style={{ textAlign: 'end', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>Modifier</button>
                <button className="btn btn-outline btn-sm" onClick={() => toggleActive(u)}>
                  {u.isActive ? 'Désactiver' : 'Réactiver'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="admin-form-card">
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>
            {editing === 'new' ? 'Nouvel utilisateur' : `Modifier — ${form.name}`}
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="field"><label>Nom complet</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required /></div>

            <div className="field"><label>Adresse e-mail</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required /></div>

            <div className="field">
              <label>
                Mot de passe
                {editing !== 'new' && ' (laisser vide pour ne pas le changer)'}
              </label>
              <input
                type="password" name="password" value={form.password} onChange={handleChange}
                required={editing === 'new'}
              />
            </div>

            <div className="field"><label>Niveau d'accès</label>
              <select name="level" value={form.level} onChange={handleChange} style={selectStyle}>
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            <div className="field"><label>Pays de rattachement</label>
              <select name="countryId" value={form.countryId} onChange={handleChange} style={selectStyle}>
                <option value="">— (Secrétariat régional)</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{pickLang(c, 'name', lang)}</option>
                ))}
              </select>
            </div>

            <div className="field"><label>Rôle dans l'organisation</label>
              <select name="orgRole" value={form.orgRole} onChange={handleChange} style={selectStyle}>
                {ORG_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {form.orgRole === 'other' && (
              <div className="field"><label>Précisez le rôle</label>
                <input type="text" name="orgRoleOther" value={form.orgRoleOther} onChange={handleChange} /></div>
            )}

            <div className="field">
              <label>Fonctions réglementaires</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginTop: '6px' }}>
                {functions.map((f) => (
                  <label key={f.code} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={form.functions.includes(f.code)}
                      onChange={() => toggleFunction(f.code)}
                    />
                    {pickLang(f, 'label', lang)}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
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
        ℹ️ Les comptes ne sont jamais supprimés mais désactivés : un utilisateur peut être
        l'auteur de documents que l'historique doit conserver. Un compte désactivé ne peut plus se connecter.
      </div>
    </div>
  );
}

export default UserManagement;