// ============================================================
// client/src/components/Flag.jsx
// Drapeau d'un pays membre.
//
// Les drapeaux sont les SVG officiels de la bibliothèque flag-icons
// (licence MIT, client/public/flags/LICENSE-flag-icons.txt), format
// 4:3, copiés tels quels dans client/public/flags/. Ne JAMAIS les
// redessiner ni les retoucher : pour une mise à jour, recopier le
// fichier depuis flag-icons (dossier flags/4x3).
//
// Usage :
//   <Flag code="tn" width={32} height={24} />          // nom affiché à côté : image décorative
//   <Flag code="tn" title="Tunisie" />                 // seul porteur du nom : alt = nom du pays
// Sans width/height, la taille vient du CSS du conteneur (ex. .flag-band) ;
// les attributs 640×480 donnent alors au navigateur la proportion 4:3
// avant le chargement (pas de saut de mise en page).
// Code inconnu : rien n'est affiché.
// ============================================================

const FLAG_CODES = ['dz', 'eg', 'ly', 'ma', 'mr', 'tn'];
// Drapeaux à dominante claire : un liseré gris les détache de la page.
const LIGHT_FLAGS = ['dz'];

function Flag({ code, width, height, title }) {
  if (!FLAG_CODES.includes(code)) return null;
  const className = LIGHT_FLAGS.includes(code) ? 'flag flag-light' : 'flag';
  return (
    <img
      src={`/flags/${code}.svg`}
      width={width ?? 640}
      height={height ?? 480}
      className={className}
      alt={title || ''}
      aria-hidden={title ? undefined : true}
      decoding="async"
      draggable="false"
    />
  );
}

export default Flag;
