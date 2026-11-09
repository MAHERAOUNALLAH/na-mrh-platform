// ============================================================
// client/src/pages/ComingSoon.jsx
// Page d'attente pour les rubriques prévues mais pas encore
// construites (Gouvernance, Portail RIMS, Contact, Réclamations).
//
// Pourquoi cette page existe : sans elle, ces URL ne correspondaient
// à AUCUNE route, et React Router rendait null — donc une page
// entièrement blanche, sans même l'en-tête ni le pied de page. Un
// écran blanc se lit comme une panne ; ici, le visiteur comprend que
// la rubrique est prévue et pas encore livrée.
//
// Le titre est passé par le routeur (titleKey) pour que la page
// annonce de quelle rubrique il s'agit.
// ============================================================

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function ComingSoon({ titleKey }) {
  const { t } = useTranslation();

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('comingSoon.kicker')}</span>
          <h2>{t(titleKey)}</h2>
          <p>{t('comingSoon.p')}</p>
        </div>

        <div className="notice-box">
          <span aria-hidden="true">🚧</span>
          <span>{t('comingSoon.notice')}</span>
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

export default ComingSoon;
