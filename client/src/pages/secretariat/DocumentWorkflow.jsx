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

// Libellés : clés docStatus.* des locales.
const STATUSES = [
  'draft_twg', 'received_secretariat', 'revision_requested', 'pending_steering',
  'distributed_internal', 'published_public', 'archived',
];

function DocumentWorkflow() {
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
  const statusLabel = (value) => t(`docStatus.${value}`, { defaultValue: value });
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

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <p style={{ fontSize: '14px', color: 'var(--ink-soft)', maxWidth: '65ch', marginBottom: '16px' }}>
        {t('adminDocuments.intro')}
      </p>

      {error && <p className="form-msg form-msg-error" role="alert">{error}</p>}

      {/* Le tableau défile dans son propre cadre : la page ne déborde jamais. */}
      <div className="table-scroll" role="region" aria-label={t('adminDocuments.tableLabel')} tabIndex={0}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('adminDocuments.colDocument')}</th><th>{t('adminDocuments.colTwg')}</th><th>{t('adminDocuments.colVersion')}</th>
              <th>{t('adminDocuments.colAuthor')}</th><th>{t('adminDocuments.colStatus')}</th>
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
                  <div className="status-cell">
                    <span className={`status-chip status-${doc.status}`}>{statusLabel(doc.status)}</span>
                    <select
                      value={doc.status}
                      onChange={(e) => handleStatusChange(doc, e.target.value)}
                      disabled={updatingId === doc.id}
                      className="status-select"
                      aria-label={t('adminDocuments.statusSelect', { title: pickLang(doc, 'title', lang) })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="note-line">
        ℹ️ {t('adminDocuments.note')}
      </div>
    </div>
  );
}

export default DocumentWorkflow;