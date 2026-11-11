// ============================================================
// client/src/pages/Home.jsx
// Accueil : hero, statistiques, mission + États membres, aperçu des
// GTT (vague 1) et dernières actualités.
//
// - Textes, liens des boutons, deux chiffres et affichage des sections :
//   modifiables par le Secrétariat (onglet « Page d'accueil »), via
//   useSiteContent() ; sans surcharge, ce sont les textes des locales.
// - Chaque section charge SES données de son côté : si un appel échoue,
//   seule cette section affiche un message discret, le reste s'affiche.
// - Pas de drapeaux sur l'accueil (les noms des pays seulement).
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';
import { apiGet } from '../utils/api';
import { useSiteContent } from '../context/SiteContentContext';

// Une liste publique chargée indépendamment des autres sections.
function usePublicList(path) {
  const [state, setState] = useState({ data: [], loading: true, error: false });
  useEffect(() => {
    apiGet(path)
      .then((data) => setState({ data, loading: false, error: false }))
      .catch((err) => {
        console.error(`Accueil : ${path} indisponible :`, err);
        setState({ data: [], loading: false, error: true });
      });
  }, [path]);
  return state;
}

// Chargement ou échec d'une section (rien si les données sont là).
function SectionStatus({ list }) {
  const { t } = useTranslation();
  if (list.loading) return <p className="section-note">{t('common.loading')}</p>;
  if (list.error) return <p className="section-note" role="status">{t('homePage.sectionError')}</p>;
  return null;
}

function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { ready, text, value, show } = useSiteContent();

  const countries = usePublicList('/api/countries');
  const twgs = usePublicList('/api/twgs');
  const news = usePublicList('/api/news');

  // Le temps de lire les surcharges (en cas d'échec, ready passe aussi
  // à true : les textes par défaut s'affichent).
  if (!ready) return <p style={{ padding: '2rem' }}>{t('common.loading')}</p>;

  const count = (list) => (list.loading ? '…' : list.error ? '—' : list.data.length);
  const statValues = [count(countries), count(twgs), value('home.stat3Value'), value('home.stat4Value')];
  const twgWave1 = twgs.data.filter((w) => w.wave === 1);
  const showMission = show('mission');
  const showCountries = show('countries');

  return (
    <div>
      {/* ---------- Hero (toujours affiché) ---------- */}
      <section className="hero">
        <div className="container">
          <div className="hero-text">
            <div className="eyebrow-line"><span className="dash"></span><span>{text('hero.kicker')}</span></div>
            <h1>{text('hero.h1')}</h1>
            <p className="lead multiline">{text('hero.lead')}</p>
            <div className="hero-ctas">
              <Link to={value('hero.cta1Link')} className="btn btn-primary">{text('hero.cta1')}</Link>
              <Link to={value('hero.cta2Link')} className="btn btn-outline">{text('hero.cta2')}</Link>
            </div>
          </div>
        </div>

        {show('stats') && (
          <div className="container">
            <div className="stats-bar">
              {statValues.map((v, i) => (
                <div key={i} className="stat">
                  <b>{v}</b>
                  <span>{text(`statsLabels.${i}`)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---------- Mission + États membres (noms seulement) ---------- */}
      {(showMission || showCountries) && (
        <section className="page-section">
          <div className="container">
            {showMission && (
              <div className="section-head">
                <span className="kicker">{text('homeSections.missionKicker')}</span>
                <h2>{text('homeSections.missionH')}</h2>
                <p className="multiline">{text('homeSections.missionP')}</p>
              </div>
            )}

            {showCountries && (
              <div className="home-countries">
                <h3>{text('homeSections.countriesH')}</h3>
                <SectionStatus list={countries} />
                {countries.data.length > 0 && (
                  <ul>
                    {countries.data.map((c) => (
                      <li key={c.id}>
                        <Link to="/etats-membres">{pickLang(c, 'name', lang)}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------- Aperçu des GTT (vague 1) ---------- */}
      {show('twgs') && (
        <section className="page-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker">{text('homeSections.twgKicker')}</span>
              <h2>{text('homeSections.twgH')}</h2>
              <p className="multiline">{text('homeSections.twgP')}</p>
            </div>

            <SectionStatus list={twgs} />
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
      )}

      {/* ---------- Actualités récentes ---------- */}
      {show('news') && (
        <section className="page-section">
          <div className="container">
            <div className="section-head">
              <span className="kicker">{text('homeSections.newsKicker')}</span>
              <h2>{text('homeSections.newsH')}</h2>
            </div>

            <SectionStatus list={news} />
            <div className="news-list">
              {news.data.slice(0, 3).map((n) => (
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
      )}
    </div>
  );
}

export default Home;
