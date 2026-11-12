// ============================================================
// client/src/pages/LegalPage.jsx
// Pages légales liées depuis le pied de page :
//   /confidentialite          → Politique de confidentialité (kind="privacy")
//   /conditions-utilisation   → Conditions d'utilisation     (kind="terms")
//
// Les textes définitifs ne sont pas encore fournis : la page affiche
// pour l'instant son titre et un avis « texte en cours de rédaction »
// (clés legal.* des locales). Quand le texte arrivera, il remplacera
// l'avis, dans les trois langues.
// ============================================================

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function LegalPage({ kind }) {
  const { t } = useTranslation();

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('legal.kicker')}</span>
          <h2>{t(`legal.${kind}`)}</h2>
        </div>

        <div className="notice-box">
          <span aria-hidden="true">ℹ️</span>
          <span>{t('legal.pending')}</span>
        </div>

        <div className="hero-ctas">
          <Link className="btn btn-outline btn-sm" to="/">
            {t('comingSoon.backHome')}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default LegalPage;
