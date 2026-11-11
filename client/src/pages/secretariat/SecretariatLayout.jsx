// ============================================================
// client/src/pages/secretariat/SecretariatLayout.jsx  (v5 — MVP complet)
// Ajout du dernier onglet : Gestion du contenu.
// ============================================================

import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/secretariat', label: 'Tableau de bord', end: true },
  { to: '/secretariat/pays', label: 'Comptes des pays' },
  { to: '/secretariat/utilisateurs', label: 'Gestion des utilisateurs' },
  { to: '/secretariat/documents', label: 'Circuit documentaire' },
  { to: '/secretariat/contenu', label: 'Gestion du contenu' },
  { to: '/secretariat/groupes-de-travail', label: 'Groupes de travail' },
];

function SecretariatLayout() {
  const tabsRef = useRef(null);
  const location = useLocation();

  // Sur mobile, les onglets forment une rangée qui défile : on amène
  // l'onglet actif au centre de la rangée. On ne fait défiler QUE la
  // rangée (scrollBy sur le conteneur), jamais la page ; le calcul en
  // positions à l'écran vaut aussi bien en LTR qu'en RTL.
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs || tabs.scrollWidth <= tabs.clientWidth) return;   // pas de défilement (bureau)
    const active = tabs.querySelector('a.active');
    if (!active) return;
    const t = tabs.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    if (a.left < t.left || a.right > t.right) {
      tabs.scrollBy({ left: (a.left + a.width / 2) - (t.left + t.width / 2) });
    }
  }, [location.pathname]);

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Zone réservée</span>
          <h2>Espace Secrétariat</h2>
        </div>

        <div className="admin-layout">
          <nav className="admin-tabs" aria-label="Espace Secrétariat" ref={tabsRef}>
            {TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end}>
                {tab.label}
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