// ============================================================
// client/src/components/Layout.jsx
// Version 3 — ajoute le bouton de connexion/déconnexion dans
// la barre du haut (corrige l'oubli de la version précédente :
// le bloc JSX manquait, seuls les imports avaient été ajoutés).
// ============================================================

import { useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR · ع' },
];

// Même table de correspondance que dans la maquette (navMap)
const NAV_ITEMS = [
  { key: 'nav.home', to: '/' },
  { key: 'nav.governance', to: '/gouvernance' },
  { key: 'nav.members', to: '/etats-membres' },
  { key: 'nav.twgs', to: '/groupes-de-travail' },
  { key: 'nav.library', to: '/bibliotheque' },
  { key: 'nav.portal', to: '/portail-rims' },
  { key: 'nav.news', to: '/actualites' },
  { key: 'nav.contact', to: '/contact' },
  { key: 'nav.complaints', to: '/reclamations' },
];

// Le logo (étoile à 8 branches) — copié tel quel depuis la maquette
const LOGO_SVG = (
  <svg viewBox="0 0 200 200" role="img" aria-label="NA-MRH">
    <circle cx="100" cy="100" r="93" fill="none" stroke="#201A15" strokeWidth="1.6" strokeOpacity="0.4" />
    <g stroke="#F7F3EA" strokeWidth="2" strokeLinejoin="round">
      <path d="M 100,100 L 86.99,68.59 L 100.0,20.0 L 113.01,68.59 Z" fill="#7C1019" />
      <path d="M 100,100 L 113.01,68.59 L 156.57,43.43 L 131.41,86.99 Z" fill="#C08A28" />
      <path d="M 100,100 L 131.41,86.99 L 180.0,100.0 L 131.41,113.01 Z" fill="#10552C" />
      <path d="M 100,100 L 131.41,113.01 L 156.57,156.57 L 113.01,131.41 Z" fill="#D9AE5C" />
      <path d="M 100,100 L 113.01,131.41 L 100.0,180.0 L 86.99,131.41 Z" fill="#0B3E20" />
      <path d="M 100,100 L 86.99,131.41 L 43.43,156.57 L 68.59,113.01 Z" fill="#D9AE5C" />
      <path d="M 100,100 L 68.59,113.01 L 20.0,100.0 L 68.59,86.99 Z" fill="#10552C" />
      <path d="M 100,100 L 68.59,86.99 L 43.43,43.43 L 86.99,68.59 Z" fill="#C08A28" />
    </g>
    <circle cx="100" cy="100" r="26" fill="#F7F3EA" stroke="#201A15" strokeWidth="2" />
    <g transform="translate(100,100) rotate(-35)" stroke="#201A15" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M 0,-8.2 L -11.2,-8.2 A 8.2,8.2 0 0 0 -11.2,8.2 L 0,8.2 Z" fill="#7C1019" />
      <path d="M 0,-8.2 L 11.2,-8.2 A 8.2,8.2 0 0 1 11.2,8.2 L 0,8.2 Z" fill="#C08A28" />
    </g>
  </svg>
);

function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  useEffect(() => {
    document.documentElement.dir = t('dir');
    document.documentElement.lang = i18n.language;
  }, [i18n.language, t]);

  return (
    <div>
      <header>
        {/* --- Barre du haut : connexion + sélecteur de langue --- */}
        <div className="topbar">
          <div className="container topbar-inner">
            {/* Connexion / déconnexion — remplace l'ancien <div/> vide */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link to="/mon-espace" className="admin-badge-btn">
                  🔒 <span>{user.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'none', border: 'none', color: 'var(--ink-soft)',
                    fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link to="/connexion" className="admin-badge-btn">
                🔒 <span>Se connecter</span>
              </Link>
            )}

            <div className="lang-switch">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={i18n.language === lang.code ? 'active' : ''}
                  onClick={() => i18n.changeLanguage(lang.code)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- Barre principale : logo + navigation --- */}
        <nav className="mainnav">
          <div className="container mainnav-inner">
            <NavLink to="/" className="logo" end>
              <span className="logo-mark">{LOGO_SVG}</span>
              <span className="logo-text">
                <b>NA-MRH</b>
                <small>{t('logoSub')}</small>
              </span>
            </NavLink>

            <div className="navlinks">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  {t(item.key)}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Le contenu de la page active s'affiche ici */}
      <main>
        <Outlet />
      </main>

      <footer>
        <div className="container footer-inner">
          <div>
            <h4>{t('footer.aboutT')}</h4>
            <p>{t('footer.aboutP')}</p>
          </div>
          <div>
            <h4>{t('footer.linksT')}</h4>
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to}>{t(item.key)}</NavLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>{t('footer.contactT')}</h4>
            <p style={{ whiteSpace: 'pre-line' }}>{t('footer.contactP')}</p>
          </div>
        </div>
        <div className="partners-row">{t('footer.partners')}</div>
      </footer>
    </div>
  );
}

export default Layout;