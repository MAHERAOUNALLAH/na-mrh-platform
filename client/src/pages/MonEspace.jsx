// ============================================================
// client/src/pages/MonEspace.jsx  (v2)
// Correction : remplace la note statique "arrive en Phase 3"
// (obsolète, le Dashboard existe désormais) par un vrai lien
// vers /secretariat pour les comptes secretariat_admin.
// ============================================================

import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const LEVEL_LABELS = {
  reader: 'Lecteur',
  contributor: 'Contributeur',
  validator: 'Validateur',
  country_admin: 'Administrateur pays',
  secretariat_admin: 'Administrateur Secrétariat',
};

function MonEspace() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Espace personnel</span>
          <h2>Bonjour, {user.name}</h2>
          <p>Connecté en tant que {LEVEL_LABELS[user.level] || user.level}.</p>
        </div>

        <div className="kv-grid">
          <div className="kv">
            <span className="label">E-mail</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>{user.email}</span>
          </div>
          <div className="kv">
            <span className="label">Niveau d'accès</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {LEVEL_LABELS[user.level] || user.level}
            </span>
          </div>
        </div>

        {user.level === 'secretariat_admin' && (
          <Link to="/secretariat" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-flex' }}>
            Accéder à l'Espace Secrétariat →
          </Link>
        )}

        <div style={{ marginTop: '16px' }}>
          <button className="btn btn-outline" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>
      </div>
    </section>
  );
}

export default MonEspace;