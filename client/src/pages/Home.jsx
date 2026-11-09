// ============================================================
// client/src/pages/Home.jsx  — VERSION FINALE
// Remplace le texte de test de la Phase 0 par le vrai contenu :
// hero, statistiques dynamiques, aperçu des pays, aperçu des
// GTT (vague 1), et les 3 dernières actualités.
//
// Nouveauté par rapport aux pages précédentes : TROIS appels
// réseau en parallèle (Promise.all) plutôt qu'un seul.
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';
import Flag from '../components/Flag';
import { apiGet } from '../utils/api';

function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [countries, setCountries] = useState([]);
  const [twgs, setTwgs] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Promise.all lance les 3 requêtes EN MÊME TEMPS plutôt que l'une
    // après l'autre : on attend le temps du plus lent des trois, pas
    // la somme des trois. Si l'une des 3 échoue, .catch() se déclenche.
    Promise.all([
      apiGet('/api/countries'),
      apiGet('/api/twgs'),
      apiGet('/api/news'),
    ])
      .then(([countriesData, twgsData, newsData]) => {
        setCountries(countriesData);
        setTwgs(twgsData);
        setNews(newsData);
      })
      .catch((err) => {
        console.error('Erreur de chargement de l\'accueil :', err);
        setError(t('common.error'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <p style={{ padding: '2rem' }}>{t('common.loading')}</p>;
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  const twgWave1 = twgs.filter((w) => w.wave === 1);
  const statValues = [countries.length, twgs.length, 4, 3];   // 4 phases prévues, 3 langues (FR/EN/AR)

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow-line"><span className="dash"></span><span>{t('hero.kicker')}</span></div>
            <h1>{t('hero.h1')}</h1>
            <p className="lead">{t('hero.lead')}</p>
            <div className="hero-ctas">
              <Link to="/etats-membres" className="btn btn-primary">{t('hero.cta1')}</Link>
              <Link to="/portail-rims" className="btn btn-outline">{t('hero.cta2')}</Link>
            </div>
          </div>

          <div className="hero-map">
            <div className="hero-map-title">{t('hero.mapTitle')}</div>
            <div className="country-strip">
              {countries.map((c) => (
                <div key={c.id} className="row">
                  <Flag code={c.id} width={24} height={17} />
                  <span>{pickLang(c, 'name', lang)}</span>
                  <small>{c.id.toUpperCase()}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container">
          <div className="stats-bar">
            {t('statsLabels', { returnObjects: true }).map((label, i) => (
              <div key={label} className="stat">
                <b>{statValues[i]}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Mission + aperçu des pays ---------- */}
      <section className="page-section">
        <div className="container">
          <div className="section-head">
            <span className="kicker">{t('homeSections.missionKicker')}</span>
            <h2>{t('homeSections.missionH')}</h2>
            <p>{t('homeSections.missionP')}</p>
          </div>

          <div className="grid-cards">
            {countries.slice(0, 3).map((c) => (
              <Link key={c.id} to="/etats-membres" className="country-card">
                <div className="flag-band"><Flag code={c.id} width="100%" height="100%" /></div>
                <div className="body">
                  <h3>{pickLang(c, 'name', lang)}</h3>
                  <span className="nra">{pickLang(c, 'nraName', lang) || t('membersPage.nraMissing')}</span>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: '16px' }}>
            <Link to="/etats-membres" className="btn btn-outline btn-sm">{t('membersPage.h')} →</Link>
          </div>
        </div>
      </section>

      {/* ---------- Aperçu des GTT (vague 1) ---------- */}
      <section className="page-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="section-head">
            <span className="kicker">{t('homeSections.twgKicker')}</span>
            <h2>{t('homeSections.twgH')}</h2>
            <p>{t('homeSections.twgP')}</p>
          </div>

          <div className="grid-cards">
            {twgWave1.map((w) => (
              <Link key={w.id} to={`/groupes-de-travail/${w.id}`} className="twg-card" data-wave={w.wave}>
                <span className="wave-tag">{t('twgsPage.wave1')}</span>
                <h3>{pickLang(w, 'name', lang)}</h3>
                <p>{pickLang(w, 'desc', lang)}</p>
                <span className="leads">
                  {t('twgsPage.leadT')} : {w.leadCountry ? pickLang(w.leadCountry, 'name', lang) : '—'}
                  {' · '}
                  {t('twgsPage.coleadT')} : {w.coleadCountry ? pickLang(w.coleadCountry, 'name', lang) : '—'}
                </span>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: '16px' }}>
            <Link to="/groupes-de-travail" className="btn btn-outline btn-sm">{t('twgsPage.h')} →</Link>
          </div>
        </div>
      </section>

      {/* ---------- Actualités récentes ---------- */}
      <section className="page-section">
        <div className="container">
          <div className="section-head">
            <span className="kicker">{t('homeSections.newsKicker')}</span>
            <h2>{t('homeSections.newsH')}</h2>
          </div>

          <div className="news-list">
            {news.slice(0, 3).map((n) => (
              <div key={n.id} className="news-item">
                <div className="news-date">{pickLang(n, 'date', lang)}</div>
                <div>
                  <h3>{pickLang(n, 'title', lang)}</h3>
                  <p>{pickLang(n, 'body', lang)}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '10px' }}>
            <Link to="/actualites" className="btn btn-outline btn-sm">{t('nav.news')} →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;