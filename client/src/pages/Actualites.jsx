// ============================================================
// client/src/pages/Actualites.jsx
// Page Actualités — même pattern fetch/loading/error que
// Twgs.jsx, sur la route /api/news.
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';
import { apiGet } from '../utils/api';

function Actualites() {
  const { t, i18n } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/news')
      .then((data) => {
        setNews(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur de chargement :', err);
        setError('newsPage.loadError');   // clé i18n : traduite à l'affichage
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ padding: '2rem' }}>{t('common.loading')}</p>;
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{t(error)}</p>;

  const lang = i18n.language;

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('newsPage.kicker')}</span>
          <h2>{t('newsPage.h')}</h2>
          <p>{t('newsPage.p')}</p>
        </div>

        <div className="news-list">
          {news.map((n) => (
            <div key={n.id} className="news-item">
              <div className="news-date">{pickLang(n, 'date', lang)}</div>
              <div>
                <h3>{pickLang(n, 'title', lang)}</h3>
                <p>{pickLang(n, 'body', lang)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Actualites;