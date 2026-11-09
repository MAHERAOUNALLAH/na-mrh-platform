// ============================================================
// client/src/components/ProtectedRoute.jsx  (v2)
//
// Nouveauté par rapport à la v1 : accepte une prop optionnelle
// "allowedLevels". Sans elle, se comporte comme avant (juste
// "faut être connecté"). Avec elle, vérifie EN PLUS le rôle —
// exactement le même principe que requireRole côté serveur,
// mais côté React ça ne fait que CACHER le bouton/la page ; la
// vraie barrière reste toujours côté serveur (voir requireRole
// dans index.js). Ne jamais faire confiance qu'à celle-ci.
//
// Usage :
//   <ProtectedRoute allowedLevels={['secretariat_admin']}>
//     <Dashboard />
//   </ProtectedRoute>
// ============================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, allowedLevels }) {
  const { user, loading, sessionError, retrySession } = useAuth();

  if (loading) return <p style={{ padding: '2rem' }}>Chargement…</p>;

  // Panne pendant la vérification de session (serveur injoignable,
  // erreur 5xx) : le jeton est conservé, on ne renvoie PAS vers la
  // connexion — on propose de réessayer.
  if (!user && sessionError) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'red', marginBottom: '12px' }}>{sessionError}</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={retrySession}>
          Réessayer
        </button>
      </div>
    );
  }

  // Pas connecté, ou session révoquée en cours de route (voir le
  // gestionnaire 401 d'AuthContext) : retour à la page de connexion.
  if (!user) return <Navigate to="/connexion" replace />;

  if (allowedLevels && !allowedLevels.includes(user.level)) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ fontWeight: 700 }}>Accès refusé</p>
        <p style={{ color: 'var(--ink-soft)' }}>
          Votre niveau d'accès ({user.level}) ne permet pas de consulter cette page.
        </p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;