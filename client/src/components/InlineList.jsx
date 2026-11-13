// ============================================================
// client/src/components/InlineList.jsx
// Liste sur une ligne, éléments séparés par « · » (partenaires du pied
// de page et de la page Gouvernance).
//
// Chaque élément est isolé dans son propre <bdi> (direction déduite de
// son contenu) et les séparateurs restent HORS des éléments : en arabe,
// un sigle latin (« CEPI ») ne se colle ni à son voisin ni au « © 2026 »
// qui suit, sans aucun caractère Unicode invisible dans les traductions.
// Rendu comme du texte React (jamais de HTML).
// ============================================================

import { Fragment } from 'react';

function InlineList({ items }) {
  return items.map((item, i) => (
    // Index en clé : deux éléments peuvent porter le même nom.
    <Fragment key={i}>
      {i > 0 && ' · '}
      <bdi>{item}</bdi>
    </Fragment>
  ));
}

export default InlineList;
