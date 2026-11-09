// ============================================================
// client/src/pages/TwgDetail.jsx
// Fiche d'un groupe de travail — équivalent React de
// pageTwgDetail() de la maquette.
//
// L'id du GTT vient de l'URL (/groupes-de-travail/ma-twg) : c'est
// useParams() qui le lit.
//
// Subtilité : passer d'un GTT à l'autre ne quitte pas la page, donc
// React réutiliserait le composant avec les anciennes données encore
// affichées. Plutôt que de remettre l'état à zéro à la main au début
// de l'effet (ce que React déconseille, et qu'ESLint refuse), on donne
// une "key" au composant : quand l'id change, React le remonte, et
// l'état repart donc naturellement de loading = true.
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';
import { apiGet } from '../utils/api';

// Ce que le routeur appelle : il ne fait que lire l'id et le passer,
// avec la key qui déclenche le remontage.
function TwgDetail() {
  const { id } = useParams();
  return <TwgDetailView id={id} key={id} />;
}

function TwgDetailView({ id }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [twg, setTwg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet(`/api/twgs/${encodeURIComponent(id)}`)
      .then((data) => {
        setTwg(data);
        setLoading(false);
      })
      .catch((err) => {
        // Un slug inconnu renvoie 404 : ce n'est pas une panne, c'est
        // un message à afficher (twg reste null → "notFound"). On le
        // distingue donc d'une vraie erreur.
        if (err.status === 404) {
          setLoading(false);
          return;
        }
        console.error('Erreur de chargement :', err);
        setError(t('common.error'));
        setLoading(false);
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p style={{ padding: '2rem' }}>{t('common.loading')}</p>;
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  // Le lien de retour doit rester accessible même quand le GTT n'existe pas.
  const backLink = (
    <Link className="back-link" to="/groupes-de-travail">
      ← {t('twgsPage.backTo')}
    </Link>
  );

  if (!twg) {
    return (
      <section className="page-section">
        <div className="container">
          {backLink}
          <p>{t('twgsPage.notFound')}</p>
        </div>
      </section>
    );
  }

  const waveLabel = t(`twgsPage.wave${twg.wave}`);

  // Dans la maquette : "Algérie — Agence Nationale des Produits
  // Pharmaceutiques (ANPP)". Les deux pays sont optionnels en base.
  const countryLine = (country) => {
    if (!country) return '—';
    const name = pickLang(country, 'name', lang);
    const nra = pickLang(country, 'nraName', lang);
    return nra ? `${name} — ${nra}` : name;
  };

  return (
    <section className="page-section">
      <div className="container">
        {backLink}

        <div className="section-head">
          <span className="kicker">
            {t('twgsPage.waveT')} : {waveLabel}
          </span>
          <h2>{pickLang(twg, 'name', lang)}</h2>
          <p>{pickLang(twg, 'desc', lang)}</p>
        </div>

        <div className="kv-grid">
          <div className="kv">
            <span className="label">{t('twgsPage.leadT')}</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {countryLine(twg.leadCountry)}
            </span>
          </div>
          <div className="kv">
            <span className="label">{t('twgsPage.coleadT')}</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {countryLine(twg.coleadCountry)}
            </span>
          </div>

          {/* La fonction réglementaire couverte n'existait pas dans la
              maquette : c'est un apport du schéma (Twg.functionCode). */}
          {twg.function && (
            <div className="kv" style={{ gridColumn: '1 / -1' }}>
              <span className="label">{t('twgsPage.functionT')}</span>
              <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>
                {pickLang(twg.function, 'label', lang)}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default TwgDetail;
