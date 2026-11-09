// ============================================================
// client/src/pages/NotFound.jsx
// Route attrape-tout (path="*") : une adresse qui n'existe pas
// (faute de frappe, ancien lien) affiche un message clair plutôt
// qu'une page blanche.
//
// À distinguer de ComingSoon : ici l'adresse n'existe pas et
// n'existera pas ; là-bas, la rubrique est prévue mais pas encore
// construite.
// ============================================================

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function NotFound() {
  const { t } = useTranslation();

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">404</span>
          <h2>{t('notFoundPage.h')}</h2>
          <p>{t('notFoundPage.p')}</p>
        </div>

        <div className="hero-ctas">
          <Link className="btn btn-primary btn-sm" to="/">
            {t('comingSoon.backHome')}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default NotFound;
