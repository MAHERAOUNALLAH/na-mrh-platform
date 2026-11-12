// ============================================================
// NA-MRH — prisma/seed-demo-content.js
// Contenu de DÉMONSTRATION SANS AUCUN COMPTE : 2 actualités et
// 3 documents publics FICTIFS, pour qu'un site fraîchement déployé
// n'affiche pas des pages vides.
//
//   - Aucun utilisateur, aucun mot de passe : l'auteur est un
//     administrateur EXISTANT (créé par scripts/create-admin.js), passé
//     en argument. Le script refuse s'il n'existe pas, n'est pas
//     secretariat_admin ou est désactivé.
//   - Chaque titre porte la mention « [Contenu de démonstration] »
//     (et ses équivalents EN / AR) : impossible de le confondre avec
//     un vrai contenu. Les textes ne relatent aucun fait réel.
//   - Idempotent : un élément dont le titre français existe déjà n'est
//     ni recréé ni modifié. ⚠️ Conséquence : si le Secrétariat renomme
//     ou supprime un élément de démonstration, une relance le recrée.
//   - Contrairement à seed-demo.js, il n'est PAS limité aux bases
//     locales (il ne crée aucun compte) ; il affiche donc la base visée
//     (sans identifiants) et demande de taper « oui » avant d'écrire.
//   - Le contenu se supprime ensuite normalement depuis l'Espace
//     Secrétariat (actualités) ou se retire du public via le circuit
//     documentaire (documents → « Archivé »).
//
// Pré-requis : seed-reference.js (les documents sont rattachés aux GTT).
// Usage :
//   npm run seed:demo-content -- --admin adresse@domaine.org
//   (ou : node prisma/seed-demo-content.js --admin adresse@domaine.org)
// ============================================================

const readline = require('node:readline');
const { fail, parseDatabaseUrl, createPrisma } = require('./script-utils');
const { normalizeEmail, isValidEmail } = require('../utils/email');

const DEMO = {
  fr: '[Contenu de démonstration]',
  en: '[Demo content]',
  ar: '[محتوى تجريبي]',
};
const title = (fr, en, ar) => ({
  titleFr: `${DEMO.fr} ${fr}`,
  titleEn: `${DEMO.en} ${en}`,
  titleAr: `${DEMO.ar} ${ar}`,
});

const NEWS = [
  {
    ...title('Bienvenue sur la plateforme', 'Welcome to the platform', 'مرحبًا بكم في المنصة'),
    dateFr: 'Nov. 2026', dateEn: 'Nov 2026', dateAr: 'نوفمبر 2026',
    sortDate: new Date('2026-11-02'),
    bodyFr: 'Cette actualité est un exemple fictif qui montre la mise en page des actualités. Elle peut être supprimée depuis l\'Espace Secrétariat.',
    bodyEn: 'This news item is a fictitious example showing how news items are displayed. It can be deleted from the Secretariat area.',
    bodyAr: 'هذا الخبر مثال وهمي يوضّح طريقة عرض الأخبار. يمكن حذفه من فضاء الأمانة.',
  },
  {
    ...title('Exemple d\'annonce de réunion', 'Example of a meeting announcement', 'مثال على إعلان اجتماع'),
    dateFr: 'Nov. 2026', dateEn: 'Nov 2026', dateAr: 'نوفمبر 2026',
    sortDate: new Date('2026-11-01'),
    bodyFr: 'Exemple fictif : aucune réunion réelle n\'est annoncée ici. Ce texte sert uniquement à illustrer le format d\'une annonce.',
    bodyEn: 'Fictitious example: no real meeting is announced here. This text only illustrates the format of an announcement.',
    bodyAr: 'مثال وهمي: لا يُعلَن هنا عن أي اجتماع حقيقي. يهدف هذا النص فقط إلى توضيح شكل الإعلان.',
  },
];

// La colonne `phase` est obligatoire en base mais n'est plus utilisée
// ni affichée : même valeur pour tous les documents.
const LEGACY_DOC_PHASE = 1;
const DOCUMENTS = [
  { ...title('Exemple de ligne directrice', 'Example guideline', 'مثال على مبدأ توجيهي'),
    category: 'guideline', phase: LEGACY_DOC_PHASE, twgId: 'ma-twg' },
  { ...title('Exemple de procédure opératoire normalisée', 'Example standard operating procedure', 'مثال على إجراء تشغيل موحّد'),
    category: 'sop', phase: LEGACY_DOC_PHASE, twgId: 'gmp-twg' },
  { ...title('Exemple de modèle de rapport', 'Example report template', 'مثال على نموذج تقرير'),
    category: 'template', phase: LEGACY_DOC_PHASE, twgId: 'qms-twg' },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const match = /^--([a-z]+)(?:=(.*))?$/.exec(argv[i]);
    if (!match || match[1] !== 'admin') fail(`Argument inattendu : "${argv[i]}". Usage : --admin adresse@domaine.org`);
    const value = match[2] !== undefined ? match[2] : argv[(i += 1)];
    if (value === undefined || value.startsWith('--')) fail('Valeur manquante pour --admin.');
    args.admin = value;
  }
  return args;
}

// Demande de taper « oui ». Fonctionne au clavier comme avec une entrée
// redirigée ; sans réponse (entrée fermée), on n'écrit rien.
function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.question(question, (answer) => { answered = true; rl.close(); resolve(answer.trim().toLowerCase() === 'oui'); });
    rl.on('close', () => { if (!answered) { process.stdout.write('\n'); resolve(false); } });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const adminEmail = normalizeEmail(args.admin);
  if (!adminEmail) fail('L\'e-mail de l\'administrateur auteur est obligatoire : --admin adresse@domaine.org');
  if (!isValidEmail(adminEmail)) fail(`Adresse e-mail invalide : "${args.admin}".`);

  const target = parseDatabaseUrl();
  const prisma = createPrisma();
  try {
    console.log(`Base visée : ${target.label}   (hôte « ${target.host} » — identifiants non affichés)`);

    // ---------- Vérifications, AVANT toute question ----------
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, name: true, level: true, isActive: true },
    });
    if (!admin) fail(`Aucun compte « ${adminEmail} » dans cette base. Créez-le d'abord avec scripts/create-admin.js.`);
    if (admin.level !== 'secretariat_admin') fail(`« ${adminEmail} » n'est pas administrateur du Secrétariat (niveau : ${admin.level}).`);
    if (!admin.isActive) fail(`Le compte « ${adminEmail} » est désactivé.`);

    const twgIds = [...new Set(DOCUMENTS.map((d) => d.twgId))];
    const twgs = await prisma.twg.findMany({ where: { id: { in: twgIds } }, select: { id: true } });
    const missingTwgs = twgIds.filter((id) => !twgs.some((t) => t.id === id));
    if (missingTwgs.length > 0) fail(`Groupes de travail absents (${missingTwgs.join(', ')}) : lancez d'abord npm run seed:reference.`);

    // ---------- Ce qui manque (idempotence par titre français) ----------
    const existingNews = await prisma.news.findMany({ where: { titleFr: { in: NEWS.map((n) => n.titleFr) } }, select: { titleFr: true } });
    const existingDocs = await prisma.document.findMany({ where: { titleFr: { in: DOCUMENTS.map((d) => d.titleFr) } }, select: { titleFr: true } });
    const newsToCreate = NEWS.filter((n) => !existingNews.some((e) => e.titleFr === n.titleFr));
    const docsToCreate = DOCUMENTS.filter((d) => !existingDocs.some((e) => e.titleFr === d.titleFr));

    console.log(`Auteur : ${admin.name} <${adminEmail}>`);
    console.log(`Actualités : ${newsToCreate.length} à créer, ${NEWS.length - newsToCreate.length} déjà présente(s), non modifiée(s)`);
    console.log(`Documents publics : ${docsToCreate.length} à créer, ${DOCUMENTS.length - docsToCreate.length} déjà présent(s), non modifié(s)`);
    if (newsToCreate.length === 0 && docsToCreate.length === 0) {
      console.log('✅ Rien à faire : tout le contenu de démonstration est déjà en place.');
      return;
    }

    const ok = await confirm(`Écrire ce contenu de démonstration dans la base ${target.label} ? Tapez « oui » pour confirmer : `);
    if (!ok) fail('Annulé : rien n\'a été écrit.');

    // ---------- Écriture, tout ou rien ----------
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const n of newsToCreate) {
        await tx.news.create({ data: { ...n, publishedAt: now } });
      }
      for (const d of docsToCreate) {
        // Même forme qu'un document passé par le circuit documentaire :
        // publié par le Secrétariat, avec sa version et ses événements.
        await tx.document.create({
          data: {
            ...d,
            status: 'published_public',
            visibility: 'public',
            version: '1.0',
            validatedByBody: 'secretariat',
            validatedById: admin.id,
            validatedAt: now,
            createdById: admin.id,
            versions: { create: { version: '1.0', note: 'Contenu de démonstration', createdById: admin.id } },
            events: {
              create: [
                { type: 'created', actorId: admin.id, toStatus: 'published_public', note: 'Contenu de démonstration' },
                { type: 'published_public', actorId: admin.id, actorBody: 'secretariat', toStatus: 'published_public', note: 'Contenu de démonstration' },
              ],
            },
          },
        });
      }
    });
    console.log(`✅ Créé : ${newsToCreate.length} actualité(s), ${docsToCreate.length} document(s) public(s). Aucun compte créé.`);
  } catch (error) {
    fail(`Erreur : ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
