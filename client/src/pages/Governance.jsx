// ============================================================
// client/src/pages/Governance.jsx
// Page statique — aucun appel réseau propre : tous les textes sont
// modifiables par l'administrateur (Espace Secrétariat › Contenu du
// site) via useSiteContent ; sans surcharge, ce sont les traductions
// (locales/*.json, bloc "governance").
// La structure est fixe (trois niveaux, mêmes blocs) : seuls les
// textes changent. Rendu comme du texte React, jamais de HTML.
// ============================================================

import { useSiteContent } from '../context/SiteContentContext';
import InlineList from '../components/InlineList';

function Governance() {
  const { text, list } = useSiteContent();

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{text('governance.kicker')}</span>
          <h2>{text('governance.h')}</h2>
          <p className="multiline">{text('governance.p')}</p>
        </div>

        <div className="kv-grid">
          <div className="kv">
            <span className="label">{text('governance.steeringT')}</span>
            <span className="value multiline" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {text('governance.steeringD')}
            </span>
          </div>
          <div className="kv">
            <span className="label">{text('governance.secretariatT')}</span>
            <span className="value multiline" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {text('governance.secretariatD')}
            </span>
          </div>
          <div className="kv" style={{ gridColumn: '1/-1' }}>
            <span className="label">{text('governance.twgLevelT')}</span>
            <span className="value multiline" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {text('governance.twgLevelD')}
            </span>
          </div>
        </div>

        <div className="section-head" style={{ marginTop: '34px' }}>
          <span className="kicker">{text('governance.partnersT')}</span>
          <p style={{ fontSize: '15.5px', fontWeight: 600 }}>
            <InlineList items={list('governance.partnersList')} />
          </p>
        </div>
      </div>
    </section>
  );
}

export default Governance;
