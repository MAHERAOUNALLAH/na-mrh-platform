// ============================================================
// client/src/components/Flag.jsx
// Drapeau d'un pays membre — portage du flagIcon() de la maquette.
//
// La maquette dessinait les drapeaux en SVG directement dans le code
// (aucune dépendance réseau, aucune image à charger). On garde ce
// principe : cinq drapeaux sont de la pure géométrie, seul celui de
// l'Égypte est une image (son aigle n'est pas dessinable en quelques
// formes). Ce PNG, qui était encodé en base64 dans la maquette, a été
// extrait dans client/public/flags/eg.png.
//
// Usage :   <Flag code="tn" width={24} height={17} />
// ============================================================

// --- Outils géométriques repris tels quels de la maquette ---

// Une étoile à 5 branches, définie par ses 10 sommets alternés
// (rayon extérieur / rayon intérieur).
function starPath(cx, cy, outerR, innerR) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(3)},${(cy + r * Math.sin(angle)).toFixed(3)}`);
  }
  return points.join(' ');
}

// Le croissant : un disque plein, puis un second disque de la couleur
// du fond légèrement décalé qui "mord" dedans, et l'étoile à côté.
function CrescentGroup({ cx, cy, r, notchFill, emblemFill, starR }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={emblemFill} />
      <circle cx={cx + r * 0.3} cy={cy} r={r * 0.82} fill={notchFill} />
      <polygon points={starPath(cx + r * 0.98, cy, starR, starR * 0.42)} fill={emblemFill} />
    </>
  );
}

// --- Le contenu de chaque drapeau, dans un repère 3 × 2 ---

function FlagInner({ code }) {
  switch (code) {
    case 'dz': // Algérie — vert/blanc, croissant et étoile rouges
      return (
        <>
          <rect width="1.5" height="2" fill="#006233" />
          <rect x="1.5" width="1.5" height="2" fill="#ffffff" />
          <CrescentGroup cx={1.6} cy={1} r={0.4} notchFill="#ffffff" emblemFill="#D21034" starR={0.15} />
        </>
      );

    case 'eg': // Égypte — image officielle, extraite de la maquette
      return <image href="/flags/eg.png" x="0" y="0" width="3" height="2" preserveAspectRatio="none" />;

    case 'ly': // Libye — rouge/noir/vert, croissant et étoile blancs
      return (
        <>
          <rect width="3" height="0.5" fill="#239E46" />
          <rect y="0.5" width="3" height="1" fill="#000000" />
          <rect y="1.5" width="3" height="0.5" fill="#E70013" />
          <CrescentGroup cx={1.55} cy={1} r={0.32} notchFill="#000000" emblemFill="#ffffff" starR={0.13} />
        </>
      );

    case 'mr': // Mauritanie — vert, croissant et étoile or, bandes rouges
      return (
        <>
          <rect width="3" height="0.18" fill="#D01C1F" />
          <rect y="0.18" width="3" height="1.64" fill="#00A65E" />
          <rect y="1.82" width="3" height="0.18" fill="#D01C1F" />
          <CrescentGroup cx={1.5} cy={1} r={0.38} notchFill="#00A65E" emblemFill="#FFC400" starR={0.15} />
        </>
      );

    case 'ma': // Maroc — rouge, pentagramme vert (étoile évidée)
      return (
        <>
          <rect width="3" height="2" fill="#C1272D" />
          <polygon points={starPath(1.5, 1, 0.46, 0.18)} fill="#006233" />
          <polygon points={starPath(1.5, 1, 0.3, 0.11)} fill="#C1272D" />
        </>
      );

    case 'tn': // Tunisie — rouge, disque blanc, croissant et étoile rouges
      return (
        <>
          <rect width="3" height="2" fill="#E70013" />
          <circle cx="1.5" cy="1" r="0.55" fill="#ffffff" />
          <CrescentGroup cx={1.5} cy={1} r={0.34} notchFill="#ffffff" emblemFill="#E70013" starR={0.14} />
        </>
      );

    default: // pays ajouté en base sans drapeau dessiné : rectangle neutre
      return <rect width="3" height="2" fill="#ccc" />;
  }
}

function Flag({ code, width = '100%', height = '100%', title }) {
  return (
    <svg
      viewBox="0 0 3 2"
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0, boxShadow: '0 0 0 1px var(--line-strong)' }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <FlagInner code={code} />
    </svg>
  );
}

export default Flag;
