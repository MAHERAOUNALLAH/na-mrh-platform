// ============================================================
// client/src/pages/Library.jsx
// Page "Bibliothèque documentaire" — équivalent React de
// pageLibrary() de la maquette.
//
// ⚠️ Cette page ne filtre RIEN pour des raisons de sécurité.
// /api/documents ne renvoie que les documents publics (filtre
// status = published_public ET visibility = public appliqué dans
// la requête Prisma). Les documents internes et confidentiels
// n'arrivent donc jamais jusqu'ici.
//
// Le filtre par catégorie ci-dessous n'est qu'un confort de lecture :
// il trie des documents déjà publics, il ne protège rien. Ne jamais
// lui confier le contrôle d'accès.
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';

// Les valeurs de l'enum DocumentCategory du schéma Prisma.
const CATEGORIES = ['guideline', 'sop', 'report', 'template'];

function Library() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [documents, setDocuments] = useState([]);
  const [restrictedCount, setRestrictedCount] = useState(0);
  const [category, setCategory] = useState('all'); // onglet actif
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/documents')
      .then((response) => response.json())
      .then((data) => {
        setDocuments(data.documents);
        setRestrictedCount(data.restrictedCount);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur de chargement :', err);
        setError(t('common.error'));
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p style={{ padding: '2rem' }}>{t('common.loading')}</p>;
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  const visible =
    category === 'all' ? documents : documents.filter((doc) => doc.category === category);

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('libraryPage.kicker')}</span>
          <h2>{t('libraryPage.h')}</h2>
          <p>{t('libraryPage.p')}</p>
        </div>

        <div className="notice-box">
          <span aria-hidden="true">⚠</span>
          <span>
            {t('libraryPage.notice')}
            {restrictedCount > 0 && ` ${t('libraryPage.restrictedNote', { n: restrictedCount })}`}
          </span>
        </div>

        <div className="lib-layout">
          {/* Colonne de gauche : les catégories */}
          <div className="lib-filters">
            {['all', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                className={category === cat ? 'active' : ''}
                onClick={() => setCategory(cat)}
              >
                {t(`libraryPage.cats.${cat}`)}
              </button>
            ))}
          </div>

          {/* Colonne de droite : les documents */}
          <div>
            {visible.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)' }}>{t('libraryPage.empty')}</p>
            ) : (
              visible.map((doc) => (
                <div className="doc-row" key={doc.id}>
                  {/* La maquette affiche les 3 premières lettres de la
                      catégorie : GUI, SOP, REP, TEM */}
                  <div className="doc-icon">{doc.category.slice(0, 3).toUpperCase()}</div>
                  <div className="meta">
                    <div className="title">{pickLang(doc, 'title', lang)}</div>
                    <div className="sub">v{doc.version}</div>
                  </div>
                  <span className={`phase-pill p${doc.phase}`}>{t(`libraryPage.p${doc.phase}`)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Library;
