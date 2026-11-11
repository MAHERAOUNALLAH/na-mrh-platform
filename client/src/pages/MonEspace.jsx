// ============================================================
// client/src/pages/MonEspace.jsx  (v2)
// Correction : remplace la note statique "arrive en Phase 3"
// (obsolète, le Dashboard existe désormais) par un vrai lien
// vers /secretariat pour les comptes secretariat_admin.
// ============================================================

import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function MonEspace() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const levelLabel = t(`levels.${user.level}`, { defaultValue: user.level });
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('myspace.kicker')}</span>
          <h2>{t('myspace.hello', { name: user.name })}</h2>
          <p>{t('myspace.connectedAs', { level: levelLabel })}</p>
        </div>

        <div className="kv-grid">
          <div className="kv">
            <span className="label">{t('myspace.emailL')}</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}><bdi dir="ltr">{user.email}</bdi></span>
          </div>
          <div className="kv">
            <span className="label">{t('myspace.levelL')}</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {levelLabel}
            </span>
          </div>
        </div>

        {user.level === 'secretariat_admin' && (
          <Link to="/secretariat" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-flex' }}>
            {t('myspace.toSecretariat')}
          </Link>
        )}

        <div style={{ marginTop: '16px' }}>
          <button className="btn btn-outline" onClick={handleLogout}>
            {t('myspace.logout')}
          </button>
        </div>
      </div>
    </section>
  );
}

export default MonEspace;