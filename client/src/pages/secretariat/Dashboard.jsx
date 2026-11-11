// ============================================================
// client/src/pages/secretariat/Dashboard.jsx
// Première page de l'Espace Secrétariat. Appelle une route
// protégée : il faut envoyer le token dans l'en-tête Authorization,
// contrairement à toutes les routes publiques précédentes.
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../utils/api';

function Dashboard() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // La différence clé avec toutes les routes publiques d'avant :
    // on doit prouver qui on est à chaque appel (token en 2e argument).
    apiGet('/api/admin/dashboard', token)
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p className="form-msg form-msg-error" role="alert">{error}</p>;
  if (!stats) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <b>{stats.countriesCount}</b>
          <span>{t('adminDashboard.countries')}</span>
        </div>
        <div className="kpi-card">
          <b>{stats.usersCount}</b>
          <span>{t('adminDashboard.users')}</span>
        </div>
        <div className="kpi-card">
          <b>{stats.pendingDocuments}</b>
          <span>{t('adminDashboard.pending')}</span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;