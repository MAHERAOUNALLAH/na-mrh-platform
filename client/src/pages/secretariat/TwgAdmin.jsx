// ============================================================
// client/src/pages/secretariat/TwgAdmin.jsx
// Onglet "Groupes de travail" — édition du contenu des GTT :
// noms et descriptions (FR/EN/AR), vague, pays lead et co-lead.
//
// Pas de création ni de suppression : les 5 GTT sont structurels
// (leur id est un slug utilisé dans les URL et les documents).
// Lecture : routes publiques /api/twgs et /api/countries.
// Écriture : PUT /api/admin/twgs/:id (réservé secretariat_admin).
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPut } from '../../utils/api';

function TwgAdmin() {
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
      wave: String(twg.wave),
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

  if (loading) return <p>Chargement…</p>;

  return (
    <div>
      <p style={{ fontSize: '14px', color: 'var(--ink-soft)', maxWidth: '58ch', marginBottom: '14px' }}>
        Contenu des groupes de travail affiché sur le site public. Les modifications
        sont visibles immédiatement sur la page « Groupes de travail ».
      </p>

      {error && <p style={{ color: 'red', fontSize: '13.5px', marginBottom: '12px' }}>{error}</p>}

      {/* Le tableau défile dans son propre cadre : la page ne déborde jamais. */}
      <div className="table-scroll" role="region" aria-label="Liste des groupes de travail" tabIndex={0}>
        <table className="admin-table">
          <thead>
            <tr><th>Vague</th><th>Groupe de travail</th><th>Lead</th><th>Co-lead</th><th></th></tr>
          </thead>
          <tbody>
            {twgs.map((twg) => (
              <tr key={twg.id}>
                <td>{twg.wave}</td>
                <td><b>{twg.nameFr}</b></td>
                <td>{twg.leadCountry ? twg.leadCountry.nameFr : '—'}</td>
                <td>{twg.coleadCountry ? twg.coleadCountry.nameFr : '—'}</td>
                <td style={{ textAlign: 'end' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(twg)}>Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && form && (
        <div className="admin-form-card">
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>
            Modifier le groupe de travail
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="field"><label>Nom (Français)</label>
              <input type="text" name="nameFr" value={form.nameFr} onChange={handleChange} required /></div>
            <div className="field"><label>Nom (Anglais)</label>
              <input type="text" name="nameEn" value={form.nameEn} onChange={handleChange} required /></div>
            <div className="field"><label>Nom (Arabe)</label>
              <input type="text" name="nameAr" value={form.nameAr} onChange={handleChange} dir="rtl" required /></div>

            <div className="field"><label>Description (Français)</label>
              <textarea rows="3" name="descFr" value={form.descFr} onChange={handleChange} /></div>
            <div className="field"><label>Description (Anglais)</label>
              <textarea rows="3" name="descEn" value={form.descEn} onChange={handleChange} /></div>
            <div className="field"><label>Description (Arabe)</label>
              <textarea rows="3" name="descAr" value={form.descAr} onChange={handleChange} dir="rtl" /></div>

            <div className="field"><label>Vague</label>
              <select name="wave" value={form.wave} onChange={handleChange}>
                <option value="1">Vague 1</option>
                <option value="2">Vague 2</option>
                <option value="3">Vague 3</option>
              </select></div>

            <div className="kv-grid" style={{ margin: '0 0 14px' }}>
              <div className="field" style={{ margin: 0 }}><label>Pays lead</label>
                <select name="leadCountryId" value={form.leadCountryId} onChange={handleChange}>
                  <option value="">— Aucun —</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.nameFr}</option>)}
                </select></div>
              <div className="field" style={{ margin: 0 }}><label>Pays co-lead</label>
                <select name="coleadCountryId" value={form.coleadCountryId} onChange={handleChange}>
                  <option value="">— Aucun —</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.nameFr}</option>)}
                </select></div>
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
    </div>
  );
}

export default TwgAdmin;