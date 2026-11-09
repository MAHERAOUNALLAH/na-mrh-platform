// ============================================================
// client/src/pages/secretariat/SecretariatLayout.jsx  (v5 — MVP complet)
// Ajout du dernier onglet : Gestion du contenu.
// ============================================================

import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/secretariat', label: 'Tableau de bord', end: true },
  { to: '/secretariat/pays', label: 'Comptes des pays' },
  { to: '/secretariat/utilisateurs', label: 'Gestion des utilisateurs' },
  { to: '/secretariat/documents', label: 'Circuit documentaire' },
  { to: '/secretariat/contenu', label: 'Gestion du contenu' },
  { to: '/secretariat/groupes-de-travail', label: 'Groupes de travail' },
];

function SecretariatLayout() {
  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Zone réservée</span>
          <h2>Espace Secrétariat</h2>
        </div>

        <div className="admin-layout">
          <div className="admin-tabs">
            {TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end}>
                {tab.label}
              </NavLink>
            ))}
          </div>
          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </section>
  );
}

export default SecretariatLayout;