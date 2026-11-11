// ============================================================
// client/src/components/Layout.jsx
// Version 3 — ajoute le bouton de connexion/déconnexion dans
// la barre du haut (corrige l'oubli de la version précédente :
// le bloc JSX manquait, seuls les imports avaient été ajoutés).
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSiteContent } from '../context/SiteContentContext';

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
  const { text, value } = useSiteContent();   // coordonnées du Secrétariat (pied de page)
  const navigate = useNavigate();
  const location = useLocation();

  // ---- Menu replié (écrans <= 1180 px, seuil propre au menu : voir index.css) ----
  // On mémorise la page sur laquelle le menu a été ouvert : dès que
  // l'adresse change, il est donc fermé, sans setState dans un effet
  // (règle ESLint react-hooks/set-state-in-effect).
  const [menuOpenOn, setMenuOpenOn] = useState(null);
  const menuOpen = menuOpenOn === location.pathname;
  const toggleRef = useRef(null);
  const headerRef = useRef(null);

  // Échap ferme le menu et rend le focus au bouton.
  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setMenuOpenOn(null);
        if (toggleRef.current) toggleRef.current.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Hauteur réelle de l'en-tête collant -> --sticky-h, utilisée par
  // scroll-padding-top : une ancre ou un champ qui reçoit le focus au
  // clavier ne se retrouve pas caché sous l'en-tête, quelle que soit sa
  // hauteur réelle (barre seule, ou barre + menu ouvert).
  useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--sticky-h', `${header.offsetHeight}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  function handleLogout() {
    logout();
    navigate('/');
  }

  // lang / dir / data-lang du document : posés dans i18n.js.

  return (
    <div>
      {/* --- Barre du haut : connexion + sélecteur de langue ---
          Hors de <header> : elle défile avec la page ; seul l'en-tête
          (logo + menu) reste collé en haut de l'écran. */}
      <div className="topbar">
        <div className="container topbar-inner">
          {/* Connexion / déconnexion — remplace l'ancien <div/> vide */}
          {user ? (
            <div className="topbar-user">
              {/* Nom tronqué sur petit écran : on le garde complet en infobulle. */}
              <Link to="/mon-espace" className="admin-badge-btn" title={user.name}>
                🔒 <span className="topbar-user-name">{user.name}</span>
              </Link>
              <button type="button" className="topbar-logout" onClick={handleLogout}>
                {t('layout.logout')}
              </button>
            </div>
          ) : (
            <Link to="/connexion" className="admin-badge-btn">
              🔒 <span>{t('layout.login')}</span>
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

      {/* --- En-tête collant : logo + navigation --- */}
      <header className="site-header" ref={headerRef}>
        <nav className="mainnav">
          <div className="container mainnav-inner">
            <NavLink to="/" className="logo" end>
              <span className="logo-mark">{LOGO_SVG}</span>
              <span className="logo-text">
                <b>NA-MRH</b>
                <small>{t('logoSub')}</small>
              </span>
            </NavLink>

            {/* Bouton du menu : visible seulement jusqu'à 1180 px (CSS). */}
            <button
              ref={toggleRef}
              type="button"
              className="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="main-menu"
              onClick={() => setMenuOpenOn(menuOpen ? null : location.pathname)}
            >
              <span className="nav-toggle-icon" aria-hidden="true"><span /><span /><span /></span>
              <span>{t('nav.menu')}</span>
            </button>

            <div id="main-menu" className={menuOpen ? 'navlinks open' : 'navlinks'}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMenuOpenOn(null)}   /* ferme aussi si on reclique la page en cours */
                >
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
            <p>
              {text('footer.contactP')}<br />
              {/* Coordonnées modifiables (Espace Secrétariat), identiques dans les
                  trois langues, isolées en LTR : en arabe, le numéro garde son ordre. */}
              <bdi dir="ltr">{value('contact.email')}</bdi> · <bdi dir="ltr">{value('contact.phone')}</bdi>
            </p>
          </div>
        </div>
        <div className="partners-row">{t('footer.partners')}</div>
      </footer>
    </div>
  );
}

export default Layout;