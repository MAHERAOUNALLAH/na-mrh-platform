// ============================================================
// client/src/pages/Twgs.jsx
// Page "Groupes de travail" (liste) — équivalent React de la
// fonction pageTwgs() de la maquette.
//
// Elle lit /api/twgs (qui renvoie chaque GTT avec son pays lead,
// son pays co-lead et sa fonction réglementaire) et affiche une
// carte .twg-card par groupe, dans la grille .grid-cards.
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';
import { apiGet } from '../utils/api';

function Twgs() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language; // 'fr' | 'en' | 'ar'

  const [twgs, setTwgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/twgs')
      .then((data) => {
        setTwgs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur de chargement :', err);
        setError(t('common.error'));
        setLoading(false);
      });
    // Le tableau vide = "ne relance ce fetch qu'une fois, au montage".
    // Changer de langue ne doit PAS redéclencher l'appel : la réponse
    // contient déjà les trois langues, on choisit juste à l'affichage.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Un pays peut ne pas être renseigné (leadCountryId est optionnel en base).
  const countryName = (country) => (country ? pickLang(country, 'name', lang) : '—');

  if (loading) return <p style={{ padding: '2rem' }}>{t('common.loading')}</p>;
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('twgsPage.kicker')}</span>
          <h2>{t('twgsPage.h')}</h2>
          <p>{t('twgsPage.p')}</p>
        </div>

        <div className="grid-cards">
          {twgs.map((twg) => (
            // Toutes les cartes ont la même apparence ; l'ordre est celui
            // de l'API (alphabétique du nom français, identique partout).
            // La carte est un <Link> : voir la règle a.twg-card dans index.css.
            <Link
              className="twg-card"
              to={`/groupes-de-travail/${twg.id}`}
              key={twg.id}
            >
              <h3>{pickLang(twg, 'name', lang)}</h3>
              <p>{pickLang(twg, 'desc', lang)}</p>
              <span className="leads">
                {t('twgsPage.leadT')}: {countryName(twg.leadCountry)} ·{' '}
                {t('twgsPage.coleadT')}: {countryName(twg.coleadCountry)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Twgs;
