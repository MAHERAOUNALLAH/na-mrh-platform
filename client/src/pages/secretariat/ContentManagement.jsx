// ============================================================
// client/src/pages/secretariat/ContentManagement.jsx
// Onglet "Gestion du contenu" — périmètre MVP : les actualités.
// (Les coordonnées des pays se gèrent déjà dans l'onglet Comptes
// des pays ; l'édition des descriptions de GTT pourra suivre le
// même pattern plus tard si besoin.)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api';

const EMPTY_FORM = {
  dateFr: '', dateEn: '', dateAr: '', sortDate: '',
  titleFr: '', titleEn: '', titleAr: '',
  bodyFr: '', bodyEn: '', bodyAr: '',
  publishNow: false,
};

function ContentManagement() {
  const { token } = useAuth();

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);   // null | 'new' | id numérique
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadNews = useCallback(() => {
    setLoading(true);
    apiGet('/api/admin/news', token)
      .then((data) => { setNews(data); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadNews(); }, [loadNews]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing('new');
  }

  function openEdit(item) {
    setForm({
      dateFr: item.dateFr || '', dateEn: item.dateEn || '', dateAr: item.dateAr || '',
      sortDate: item.sortDate ? item.sortDate.slice(0, 10) : '',   // format AAAA-MM-JJ pour <input type="date">
      titleFr: item.titleFr, titleEn: item.titleEn, titleAr: item.titleAr,
      bodyFr: item.bodyFr || '', bodyEn: item.bodyEn || '', bodyAr: item.bodyAr || '',
      publishNow: Boolean(item.publishedAt),
    });
    setEditing(item.id);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const action = editing === 'new'
      ? apiPost('/api/admin/news', token, form)
      : apiPut(`/api/admin/news/${editing}`, token, form);

    action
      .then(() => { setEditing(null); loadNews(); })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  function handleDelete(item) {
    if (!window.confirm(`Supprimer définitivement « ${item.titleFr} » ?`)) return;
    apiDelete(`/api/admin/news/${item.id}`, token)
      .then(() => loadNews())
      .catch((err) => setError(err.message));
  }

  if (loading) return <p>Chargement…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <p style={{ fontSize: '14px', color: 'var(--ink-soft)', maxWidth: '58ch' }}>
          Actualités affichées sur le site public. Un brouillon non publié n'apparaît
          jamais côté public, seulement ici.
        </p>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Ajouter une actualité</button>
      </div>

      {error && <p style={{ color: 'red', fontSize: '13.5px', marginBottom: '12px' }}>{error}</p>}

      <table className="admin-table">
        <thead>
          <tr><th>Date</th><th>Titre</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          {news.map((item) => (
            <tr key={item.id}>
              <td>{item.dateFr}</td>
              <td><b>{item.titleFr}</b></td>
              <td>
                <span className={`status-chip ${item.publishedAt ? 'status-published_public' : 'status-draft_twg'}`}>
                  {item.publishedAt ? 'Publiée' : 'Brouillon'}
                </span>
              </td>
              <td style={{ textAlign: 'end', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}>Modifier</button>
                <button className="btn btn-outline btn-sm" onClick={() => handleDelete(item)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="admin-form-card">
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>
            {editing === 'new' ? 'Nouvelle actualité' : 'Modifier l\'actualité'}
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="field"><label>Date de tri (pour l'ordre d'affichage)</label>
              <input type="date" name="sortDate" value={form.sortDate} onChange={handleChange} required /></div>

            <div className="kv-grid" style={{ margin: '0 0 14px' }}>
              <div className="field" style={{ margin: 0 }}><label>Date affichée (Français)</label>
                <input type="text" name="dateFr" value={form.dateFr} onChange={handleChange} placeholder="Sept. 2026" /></div>
              <div className="field" style={{ margin: 0 }}><label>Date affichée (Anglais)</label>
                <input type="text" name="dateEn" value={form.dateEn} onChange={handleChange} placeholder="Sep 2026" /></div>
            </div>
            <div className="field"><label>Date affichée (Arabe)</label>
              <input type="text" name="dateAr" value={form.dateAr} onChange={handleChange} dir="rtl" /></div>

            <div className="field"><label>Titre (Français)</label>
              <input type="text" name="titleFr" value={form.titleFr} onChange={handleChange} required /></div>
            <div className="field"><label>Titre (Anglais)</label>
              <input type="text" name="titleEn" value={form.titleEn} onChange={handleChange} required /></div>
            <div className="field"><label>Titre (Arabe)</label>
              <input type="text" name="titleAr" value={form.titleAr} onChange={handleChange} dir="rtl" required /></div>

            <div className="field"><label>Texte (Français)</label>
              <textarea rows="3" name="bodyFr" value={form.bodyFr} onChange={handleChange} /></div>
            <div className="field"><label>Texte (Anglais)</label>
              <textarea rows="3" name="bodyEn" value={form.bodyEn} onChange={handleChange} /></div>
            <div className="field"><label>Texte (Arabe)</label>
              <textarea rows="3" name="bodyAr" value={form.bodyAr} onChange={handleChange} dir="rtl" /></div>

            <div className="field-check">
              <input type="checkbox" id="publishNow" name="publishNow" checked={form.publishNow} onChange={handleChange} />
              <label htmlFor="publishNow">Publier sur le site public</label>
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

export default ContentManagement;