// ============================================================
// client/src/pages/Governance.jsx
// Page statique — aucun appel réseau, tout le contenu vient
// des traductions (locales/*.json, bloc "governance"), sauf la
// description du Secrétariat, modifiable par l'administrateur
// (useSiteContent ; texte par défaut : governance.secretariatD).
// ============================================================

import { useTranslation } from 'react-i18next';
import { useSiteContent } from '../context/SiteContentContext';

function Governance() {
  const { t } = useTranslation();
  const { text } = useSiteContent();

  return (
    <section className="page-section">
      <div className="container">
        <div className="section-head">
          <span className="kicker">{t('governance.kicker')}</span>
          <h2>{t('governance.h')}</h2>
          <p>{t('governance.p')}</p>
        </div>

        <div className="kv-grid">
          <div className="kv">
            <span className="label">{t('governance.steeringT')}</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {t('governance.steeringD')}
            </span>
          </div>
          <div className="kv">
            <span className="label">{t('governance.secretariatT')}</span>
            <span className="value multiline" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {text('governance.secretariatD')}
            </span>
          </div>
          <div className="kv" style={{ gridColumn: '1/-1' }}>
            <span className="label">{t('governance.twgLevelT')}</span>
            <span className="value" style={{ fontWeight: 400, fontSize: '14.5px' }}>
              {t('governance.twgLevelD')}
            </span>
          </div>
        </div>

        <div className="section-head" style={{ marginTop: '34px' }}>
          <span className="kicker">{t('governance.partnersT')}</span>
          <p style={{ fontSize: '15.5px', fontWeight: 600 }}>{t('governance.partnersP')}</p>
        </div>
      </div>
    </section>
  );
}

export default Governance;