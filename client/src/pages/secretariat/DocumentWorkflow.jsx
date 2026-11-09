// ============================================================
// client/src/pages/secretariat/DocumentWorkflow.jsx
// Onglet "Circuit documentaire" — périmètre MVP : liste de tous
// les documents + changement de statut. Le versionning et les
// commentaires viendront en Phase 4.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { pickLang } from '../../utils/lang';
import { apiGet, apiPatch } from '../../utils/api';

const STATUSES = [
  { value: 'draft_twg', label: 'Brouillon GTT' },
  { value: 'received_secretariat', label: 'Reçu par le Secrétariat' },
  { value: 'revision_requested', label: 'Révision demandée' },
  { value: 'pending_steering', label: 'Soumis au Comité de Pilotage' },
  { value: 'distributed_internal', label: 'Diffusé en interne' },
  { value: 'published_public', label: 'Publié au public' },
  { value: 'archived', label: 'Archivé' },
];

const selectStyle = {
  padding: '7px 10px', border: '1px solid var(--line-strong)',
  borderRadius: '2px', background: 'var(--bg)', fontFamily: 'inherit', fontSize: '13px',
};

function statusLabel(value) {
  return STATUSES.find((s) => s.value === value)?.label || value;
}

function DocumentWorkflow() {
  const { token } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);   // pour désactiver le select pendant l'envoi

  // Pas de setLoading(true) ici : la fonction est appelée par le useEffect,
  // et la règle ESLint react-hooks/set-state-in-effect interdit tout
  // setState synchrone dans un effet. loading vaut déjà true au premier
  // rendu (même motif que TwgAdmin.jsx). Un changement de statut met à
  // jour la ligne concernée sans recharger la liste.
  const loadDocuments = useCallback(() => {
    apiGet('/api/admin/documents', token)
      .then((data) => { setDocuments(data); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  function handleStatusChange(doc, newStatus) {
    setUpdatingId(doc.id);
    apiPatch(`/api/admin/documents/${doc.id}/status`, token, { status: newStatus })
      .then((updated) => {
        // On met à jour juste cette ligne, sans recharger toute la liste :
        // plus rapide, et pas de "saut" visuel pendant le tri par statut.
        setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setUpdatingId(null));
  }

  if (loading) return <p>Chargement…</p>;

  return (
    <div>
      <p style={{ fontSize: '14px', color: 'var(--ink-soft)', maxWidth: '65ch', marginBottom: '16px' }}>
        Ensemble des documents produits par les groupes de travail, tous statuts confondus.
        Changer le statut vers « Publié au public » le rend immédiatement visible sur la
        Bibliothèque publique ; tout autre statut le garde réservé au portail sécurisé.
      </p>

      {error && <p style={{ color: 'red', fontSize: '13.5px', marginBottom: '12px' }}>{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Document</th><th>GTT</th><th>Version</th><th>Auteur</th><th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td><b>{pickLang(doc, 'title', lang)}</b></td>
              <td>{doc.twg ? pickLang(doc.twg, 'name', lang) : '—'}</td>
              <td>v{doc.version}</td>
              <td>{doc.createdBy?.name || '—'}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`status-chip status-${doc.status}`}>{statusLabel(doc.status)}</span>
                  <select
                    value={doc.status}
                    onChange={(e) => handleStatusChange(doc, e.target.value)}
                    disabled={updatingId === doc.id}
                    style={selectStyle}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="note-line">
        ℹ️ Le versionning, les commentaires et l'historique détaillé par document
        arriveront dans une prochaine étape (Phase 4).
      </div>
    </div>
  );
}

export default DocumentWorkflow;