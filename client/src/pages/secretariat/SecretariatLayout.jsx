// ============================================================
// client/src/pages/secretariat/SecretariatLayout.jsx
// Coquille de l'Espace Secrétariat : menu de gauche + page de l'onglet.
//
// Menu à SOUS-POINTS : une entrée qui a des `children` (aujourd'hui
// « Contenu du site », sous-points tirés de siteContentParts.js) mène à
// son premier sous-point, et sa liste n'est dépliée que lorsqu'on est
// dans la rubrique (aria-expanded sur l'entrée parent ; aria-current=
// "page" posé par NavLink sur le sous-point courant).
//   - bureau (> 768 px) : sous-points en retrait sous leur parent ;
//   - mobile (≤ 768 px) : le menu est une rangée qui défile, et les
//     sous-points forment une DEUXIÈME rangée défilante juste dessous.
// Les deux listes viennent des mêmes données ; une seule est visible
// (l'autre est en display:none, donc ni lue ni atteignable au clavier).
// ============================================================

import { Fragment, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SITE_CONTENT_BASE, SITE_CONTENT_PARTS, partPath } from './siteContentParts';

// Libellés : clés adminLayout.tabs.* (entrées) et adminHome.parts.* (sous-points).
const TABS = [
  { to: '/secretariat', label: 'dashboard', end: true },
  { to: '/secretariat/pays', label: 'countries' },
  { to: '/secretariat/utilisateurs', label: 'users' },
  { to: '/secretariat/documents', label: 'documents' },
  { to: '/secretariat/contenu', label: 'news' },
  { to: '/secretariat/groupes-de-travail', label: 'twgs' },
  {
    to: SITE_CONTENT_BASE,
    label: 'home',
    children: SITE_CONTENT_PARTS.map((p) => ({ to: partPath(p), label: `adminHome.parts.${p.id}` })),
  },
];

const SUB_DESKTOP = 'admin-subtabs';
const SUB_MOBILE = 'admin-subtabs-row';

// Est-on dans la rubrique de cette entrée (elle-même ou un sous-point) ?
const inSection = (tab, pathname) => pathname === tab.to || pathname.startsWith(`${tab.to}/`);

// Amène l'élément actif d'une rangée défilante au centre de la rangée.
// On ne fait défiler QUE la rangée (scrollBy sur le conteneur), jamais la
// page ; le calcul en positions à l'écran vaut en LTR comme en RTL.
function centerActive(row, selector) {
  if (!row || row.scrollWidth <= row.clientWidth) return;   // pas de défilement (bureau)
  const active = row.querySelector(selector);
  if (!active) return;
  const r = row.getBoundingClientRect();
  const a = active.getBoundingClientRect();
  if (a.left < r.left || a.right > r.right) {
    row.scrollBy({ left: (a.left + a.width / 2) - (r.left + r.width / 2) });
  }
}

function SubTabs({ id, className, items, label, rowRef }) {
  const { t } = useTranslation();
  return (
    <ul id={id} className={className} aria-label={label} ref={rowRef}>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end>{t(item.label)}</NavLink>
        </li>
      ))}
    </ul>
  );
}

function SecretariatLayout() {
  const tabsRef = useRef(null);
  const subRowRef = useRef(null);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const openTab = TABS.find((tab) => tab.children && inSection(tab, location.pathname));

  // Sur mobile, à chaque changement de page ET de langue (passer de FR à AR
  // inverse le sens des rangées et leur position de défilement), on amène
  // l'onglet actif — et le sous-point actif — dans la vue.
  // requestAnimationFrame : l'effet d'un enfant s'exécute avant celui du
  // Layout parent, qui pose dir="rtl" ; on mesure une image plus tard.
  // Polices : la police arabe n'est chargée qu'au premier affichage en
  // arabe ; à son arrivée, les libellés changent de largeur et l'élément
  // actif pouvait ressortir de la vue (mesuré : 35 px hors de la rangée à
  // 360 px). On recentre donc une seconde fois quand les polices sont prêtes.
  useEffect(() => {
    let done = false;
    const center = () => {
      if (done) return;
      centerActive(tabsRef.current, ':scope > a.active');
      centerActive(subRowRef.current, 'a.active');
    };
    const frame = requestAnimationFrame(() => {
      center();
      if (document.fonts) document.fonts.ready.then(center);
    });
    return () => { done = true; cancelAnimationFrame(frame); };
  }, [location.pathname, i18n.language]);

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('adminLayout.kicker')}</span>
          <h2>{t('adminLayout.title')}</h2>
        </div>

        <div className="admin-layout">
          <nav className="admin-nav" aria-label={t('adminLayout.tabsLabel')}>
            <div className="admin-tabs" ref={tabsRef}>
              {TABS.map((tab) => {
                if (!tab.children) {
                  return (
                    <NavLink key={tab.to} to={tab.to} end={tab.end}>
                      {t(`adminLayout.tabs.${tab.label}`)}
                    </NavLink>
                  );
                }
                const open = tab === openTab;
                return (
                  <Fragment key={tab.to}>
                    {/* Entrée parent : mène au premier sous-point. Pas de
                        aria-current : il est porté par le sous-point courant. */}
                    <Link
                      to={tab.children[0].to}
                      className={open ? 'active admin-tab-parent' : 'admin-tab-parent'}
                      aria-expanded={open}
                      aria-controls={open ? `${SUB_DESKTOP} ${SUB_MOBILE}` : undefined}
                    >
                      {t(`adminLayout.tabs.${tab.label}`)}
                    </Link>
                    {open && <SubTabs id={SUB_DESKTOP} className={SUB_DESKTOP} items={tab.children} label={t(`adminLayout.tabs.${tab.label}`)} />}
                  </Fragment>
                );
              })}
            </div>
            {openTab && (
              <SubTabs id={SUB_MOBILE} className={SUB_MOBILE} items={openTab.children} label={t(`adminLayout.tabs.${openTab.label}`)} rowRef={subRowRef} />
            )}
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
