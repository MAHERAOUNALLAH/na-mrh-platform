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

// Libellés : clés levels.* et orgRoles.* des locales.
const LEVELS = ['reader', 'contributor', 'validator', 'country_admin', 'secretariat_admin'];
const ORG_ROLES = ['', 'president', 'vice_president', 'member', 'secretariat', 'other'];

const EMPTY_FORM = {
  name: '', email: '', password: '', level: 'reader',
  countryId: '', orgRole: '', orgRoleOther: '', functions: [],
};

function UserManagement() {
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
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
    const question = user.isActive ? 'adminUsers.confirmDeactivate' : 'adminUsers.confirmReactivate';
    if (!window.confirm(t(question, { name: user.name }))) return;

    apiPatch(`/api/admin/users/${user.id}/active`, token, { isActive: !user.isActive })
      .then(() => reloadUsers())
      .catch((err) => setError(err.message));
  }

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <div className="admin-toolbar">
        <p style={{ fontSize: '14px', color: 'var(--ink-soft)', maxWidth: '58ch' }}>
          {t('adminUsers.intro')}
        </p>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>{t('adminUsers.add')}</button>
      </div>

      <div className="field" style={{ maxWidth: '280px' }}>
        <label htmlFor="users-filter">{t('adminUsers.filterL')}</label>
        <select id="users-filter" value={filterCountry} onChange={(e) => changeFilter(e.target.value)}>
          <option value="">{t('adminUsers.allCountries')}</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>{pickLang(c, 'name', lang)}</option>
          ))}
        </select>
      </div>

      {error && <p className="form-msg form-msg-error" role="alert">{error}</p>}

      {/* Le tableau défile dans son propre cadre : la page ne déborde jamais. */}
      <div className="table-scroll" role="region" aria-label={t('adminUsers.tableLabel')} tabIndex={0}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('adminUsers.colName')}</th><th>{t('adminUsers.colEmail')}</th>
              <th>{t('adminUsers.colCountry')}</th><th>{t('adminUsers.colLevel')}</th>
              <th>{t('adminUsers.colFunctions')}</th><th>{t('adminUsers.colTwgRoles')}</th>
              <th>{t('adminUsers.colStatus')}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                <td><b>{u.name}</b></td>
                <td><bdi dir="ltr">{u.email}</bdi></td>
                <td>{u.country ? pickLang(u.country, 'name', lang) : '—'}</td>
                <td>{t(`levels.${u.level}`, { defaultValue: u.level })}</td>
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
                          {t(`twgRoles.${m.role}`, { defaultValue: m.role })} · {pickLang(m.twg, 'name', lang)}
                        </span>
                      ))
                    : '—'}
                </td>
                <td>{u.isActive ? t('adminUsers.active') : t('adminUsers.inactive')}</td>
                <td className="cell-actions">
                  <div className="row-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>{t('admin.edit')}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => toggleActive(u)}>
                      {u.isActive ? t('adminUsers.deactivate') : t('adminUsers.reactivate')}
                    </button>
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
            {editing === 'new' ? t('adminUsers.newTitle') : t('adminUsers.editTitle', { name: form.name })}
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="field"><label>{t('adminUsers.fullNameL')}</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required /></div>

            <div className="field"><label>{t('adminUsers.emailL')}</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required /></div>

            <div className="field">
              <label>
                {editing === 'new' ? t('adminUsers.passwordL') : t('adminUsers.passwordKeepL')}
              </label>
              <input
                type="password" name="password" value={form.password} onChange={handleChange}
                required={editing === 'new'}
              />
            </div>

            <div className="field"><label>{t('adminUsers.levelL')}</label>
              <select name="level" value={form.level} onChange={handleChange}>
                {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
              </select>
            </div>

            <div className="field"><label>{t('adminUsers.countryL')}</label>
              <select name="countryId" value={form.countryId} onChange={handleChange}>
                <option value="">{t('adminUsers.noCountry')}</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{pickLang(c, 'name', lang)}</option>
                ))}
              </select>
            </div>

            <div className="field"><label>{t('adminUsers.orgRoleL')}</label>
              <select name="orgRole" value={form.orgRole} onChange={handleChange}>
                {ORG_ROLES.map((r) => <option key={r} value={r}>{r ? t(`orgRoles.${r}`) : '—'}</option>)}
              </select>
            </div>

            {form.orgRole === 'other' && (
              <div className="field"><label>{t('adminUsers.orgRoleOtherL')}</label>
                <input type="text" name="orgRoleOther" value={form.orgRoleOther} onChange={handleChange} /></div>
            )}

            <div className="field">
              <label>{t('adminUsers.functionsL')}</label>
              <div className="check-options">
                {functions.map((f) => (
                  <label key={f.code} className="check-option">
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
        ℹ️ {t('adminUsers.note')}
      </div>
    </div>
  );
}

export default UserManagement;