// ============================================================
// client/src/pages/secretariat/Dashboard.jsx
// Première page de l'Espace Secrétariat. Appelle une route
// protégée : il faut envoyer le token dans l'en-tête Authorization,
// contrairement à toutes les routes publiques précédentes.
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/admin/dashboard', {
      // La différence clé avec toutes les routes publiques d'avant :
      // on doit prouver qui on est à chaque appel.
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Erreur de chargement');
        return data;
      })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!stats) return <p>Chargement…</p>;

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <b>{stats.countriesCount}</b>
          <span>Comptes pays actifs</span>
        </div>
        <div className="kpi-card">
          <b>{stats.usersCount}</b>
          <span>Utilisateurs internes</span>
        </div>
        <div className="kpi-card">
          <b>{stats.pendingDocuments}</b>
          <span>Documents en attente de décision</span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;