// ============================================================
// client/src/pages/Members.jsx
// Page "États membres" — équivalent React de pageMembers() de la
// maquette. Remplace la liste <ul> de travail par la vraie grille
// de cartes .country-card, et passe au multilingue via pickLang.
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';
import Flag from '../components/Flag';

function Members() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language; // 'fr' | 'en' | 'ar'

  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/countries')
      .then((response) => response.json())
      .then((data) => {
        setCountries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur de chargement :', err);
        setError(t('common.error'));
        setLoading(false);
      });
    // Comme pour les GTT : on ne recharge pas au changement de langue,
    // la réponse contient déjà les trois langues.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p style={{ padding: '2rem' }}>{t('common.loading')}</p>;
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  // L'API trie par nameFr, ce qui ne veut plus rien dire dès qu'on lit
  // la page en anglais ou en arabe. On retrie donc selon la langue
  // affichée, avec localeCompare (qui gère les accents : "Égypte" doit
  // se classer à E, pas après Z).
  //
  // Trier n'est pas filtrer : c'est du confort de lecture sur des
  // données déjà publiques. Un filtre de sécurité, lui, resterait
  // côté serveur (voir /api/documents).
  const sorted = [...countries].sort((a, b) =>
    pickLang(a, 'name', lang).localeCompare(pickLang(b, 'name', lang), lang)
  );

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('membersPage.kicker')}</span>
          <h2>{t('membersPage.h')}</h2>
          <p>{t('membersPage.p')}</p>
        </div>

        <div className="grid-cards">
          {sorted.map((country) => {
            const name = pickLang(country, 'name', lang);
            // nraNameFr/En/Ar sont optionnels en base (String?)
            const nra = pickLang(country, 'nraName', lang);

            return (
              <div className="country-card" key={country.id}>
                <div className="flag-band">
                  {/* country.id vaut 'dz', 'tn'… : c'est aussi le code du drapeau */}
                  <Flag code={country.id} title={name} />
                </div>
                <div className="body">
                  <h3>{name}</h3>
                  <span className="nra">{nra || t('membersPage.nraMissing')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Members;
