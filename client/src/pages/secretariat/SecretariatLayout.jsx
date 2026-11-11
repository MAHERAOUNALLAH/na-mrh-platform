// ============================================================
// client/src/pages/secretariat/SecretariatLayout.jsx  (v5 — MVP complet)
// Ajout du dernier onglet : Gestion du contenu.
// ============================================================

import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Libellés : clés adminLayout.tabs.* des locales.
const TABS = [
  { to: '/secretariat', label: 'dashboard', end: true },
  { to: '/secretariat/pays', label: 'countries' },
  { to: '/secretariat/utilisateurs', label: 'users' },
  { to: '/secretariat/documents', label: 'documents' },
  { to: '/secretariat/contenu', label: 'news' },
  { to: '/secretariat/groupes-de-travail', label: 'twgs' },
  { to: '/secretariat/accueil', label: 'home' },
];

function SecretariatLayout() {
  const tabsRef = useRef(null);
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // Sur mobile, les onglets forment une rangée qui défile : on amène
  // l'onglet actif au centre de la rangée, à chaque changement de page ET
  // de langue (passer de FR à AR inverse le sens de la rangée et sa
  // position de défilement). On ne fait défiler QUE la rangée (scrollBy
  // sur le conteneur), jamais la page ; le calcul en positions à l'écran
  // vaut en LTR comme en RTL. requestAnimationFrame : l'effet d'un enfant
  // s'exécute avant celui du Layout parent, qui pose dir="rtl" ; on mesure
  // donc une image plus tard, dans la direction définitive.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const tabs = tabsRef.current;
      if (!tabs || tabs.scrollWidth <= tabs.clientWidth) return;   // pas de défilement (bureau)
      const active = tabs.querySelector('a.active');
      if (!active) return;
      const t = tabs.getBoundingClientRect();
      const a = active.getBoundingClientRect();
      if (a.left < t.left || a.right > t.right) {
        tabs.scrollBy({ left: (a.left + a.width / 2) - (t.left + t.width / 2) });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, i18n.language]);

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('adminLayout.kicker')}</span>
          <h2>{t('adminLayout.title')}</h2>
        </div>

        <div className="admin-layout">
          <nav className="admin-tabs" aria-label={t('adminLayout.tabsLabel')} ref={tabsRef}>
            {TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end}>
                {t(`adminLayout.tabs.${tab.label}`)}
              </NavLink>
            ))}
          </nav>
          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </section>
  );
}

export default SecretariatLayout;