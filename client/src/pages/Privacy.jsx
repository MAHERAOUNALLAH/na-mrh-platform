// ============================================================
// client/src/pages/Privacy.jsx
// Page publique « Confidentialité et conditions d'utilisation »
// (/confidentialite), lien dans le pied de page.
//
// Titre et texte modifiables par le Secrétariat (Contenu du site ›
// Confidentialité) : clés privacy.title et privacy.body du registre.
// privacy.body n'a AUCUN texte par défaut (aucun texte juridique
// inventé) : tant que la langue affichée n'a pas de texte enregistré,
// la page affiche « Ce contenu sera publié prochainement. ».
// Texte brut rendu par React (jamais de HTML) ; une ligne vide sépare
// deux paragraphes, un simple retour à la ligne est conservé (.multiline).
// ============================================================

import { useTranslation } from 'react-i18next';
import { useSiteContent } from '../context/SiteContentContext';

function Privacy() {
  const { t } = useTranslation();
  const { ready, text, custom } = useSiteContent();
  const body = custom('privacy.body');
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  let content;
  if (!ready) content = <p>{t('common.loading')}</p>;
  else if (!paragraphs.length) content = <p className="section-note">{t('privacyPage.soon')}</p>;
  else {
    content = (
      <div className="legal-text">
        {paragraphs.map((p, i) => <p key={i} className="multiline">{p}</p>)}
      </div>
    );
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('privacyPage.kicker')}</span>
          <h2>{text('privacy.title')}</h2>
        </div>
        {content}
      </div>
    </section>
  );
}

export default Privacy;
