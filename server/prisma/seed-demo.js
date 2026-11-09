// ============================================================
// NA-MRH — prisma/seed-demo.js  (DÉVELOPPEMENT LOCAL UNIQUEMENT)
// Données de DÉMONSTRATION : 10 comptes de test, appartenances aux GTT,
// documents, actualités et une réclamation d'exemple.
//
// ⛔ JAMAIS EN PRODUCTION : tous les comptes ont le mot de passe
// "password123", écrit en clair ci-dessous, dans un dépôt public.
// Garde-fou : le script REFUSE de tourner si DATABASE_URL ne désigne
// pas une base locale (localhost / 127.0.0.1 / ::1), ou si
// NODE_ENV=production — sauf ALLOW_DEMO_SEED=1, à réserver à une base
// de recette jetable.
//
// Pré-requis : les données de référence (npm run seed:reference).
// Lancement normal en local : npm run seed (référence puis démo).
//
// NOTE MOTS DE PASSE (dev local uniquement) :
//   Tous les utilisateurs de test ont le mot de passe : "password123"
//   Il est haché avec bcrypt avant insertion. En clair ici pour vos tests.
//
// ⚠️ Les documents, actualités et la réclamation sont créés à chaque
// exécution (pas d'upsert) : relancer ce script les duplique.
// ============================================================

const bcrypt = require('bcryptjs');
const { fail, parseDatabaseUrl, isLocalHost, createPrisma } = require('./script-utils');

// ---------- Garde-fou, AVANT toute connexion à la base ----------
const target = parseDatabaseUrl();
const allowed = process.env.ALLOW_DEMO_SEED === '1';
if (!allowed && !isLocalHost(target.host)) {
  fail(`Seed de démonstration REFUSÉ : la base visée (hôte "${target.host}") n'est pas locale.\n`
    + '   Ce script crée des comptes au mot de passe public "password123".\n'
    + '   Pour une base de recette jetable uniquement : ALLOW_DEMO_SEED=1.');
}
if (!allowed && process.env.NODE_ENV === 'production') {
  fail('Seed de démonstration REFUSÉ : NODE_ENV=production.\n'
    + '   Pour une base de recette jetable uniquement : ALLOW_DEMO_SEED=1.');
}
if (allowed) {
  console.warn(`⚠️  ALLOW_DEMO_SEED=1 : garde-fou levé pour la base ${target.label}.`);
}

const prisma = createPrisma();

async function main() {
  console.log(`🌱 Seed de démonstration — base : ${target.label}`);

  // Mot de passe commun à tous les comptes de test : "password123"
  const passwordHash = await bcrypt.hash('password123', 10);

  // Les données de référence (fonctions, pays, GTT) viennent de
  // seed-reference.js : on vérifie qu'elles sont là avant de continuer.
  const [nFunctions, nCountries, nTwgs] = await Promise.all([
    prisma.function.count(), prisma.country.count(), prisma.twg.count(),
  ]);
  if (nFunctions === 0 || nCountries === 0 || nTwgs === 0) {
    fail('Données de référence absentes : lancez d\'abord npm run seed:reference (ou npm run seed).');
  }

  // ----------------------------------------------------------
  // 4. UTILISATEURS (10)  — tous mot de passe : "password123"
  //    level : reader | contributor | validator | country_admin | secretariat_admin
  // ----------------------------------------------------------
  const usersData = [
    { countryId: 'dz', name: 'Amine Belkacem',     email: 'a.belkacem@anpp.dz',        level: 'country_admin', orgRole: 'president',      functions: ['MA'] },
    { countryId: 'dz', name: 'Sonia Kaddour',      email: 's.kaddour@anpp.dz',         level: 'contributor',   orgRole: null,             functions: ['MA', 'PV'] },
    { countryId: 'eg', name: 'Heba El-Sayed',      email: 'h.elsayed@edaegypt.gov.eg', level: 'country_admin', orgRole: 'member',         functions: ['GMP', 'IMS'] },
    { countryId: 'eg', name: 'Karim Fathy',        email: 'k.fathy@edaegypt.gov.eg',   level: 'validator',     orgRole: null,             functions: ['QMS', 'PV'] },
    { countryId: 'ly', name: 'Mohamed Saleh',      email: 'm.saleh@fdcc.ly',           level: 'country_admin', orgRole: 'member',         functions: ['GMP'] },
    { countryId: 'mr', name: 'Fatimetou Mint Sidi',email: 'f.sidi@sante.gov.mr',       level: 'country_admin', orgRole: 'member',         functions: ['MA'] },
    { countryId: 'ma', name: 'Yasmine Alaoui',     email: 'y.alaoui@ammps.gov.ma',     level: 'country_admin', orgRole: 'vice_president', functions: ['QMS'] },
    { countryId: 'ma', name: 'Omar Bennis',        email: 'o.bennis@ammps.gov.ma',     level: 'contributor',   orgRole: null,             functions: ['QMS', 'MA'] },
    { countryId: 'tn', name: 'Mariam Aounallah',   email: 'm.aounallah@anmps.tn',      level: 'secretariat_admin', orgRole: 'secretariat', functions: ['IMS', 'PV'] },
    { countryId: 'tn', name: 'Walid Trabelsi',     email: 'w.trabelsi@anmps.tn',       level: 'reader',        orgRole: null,             functions: ['IMS'] },
  ];

  const usersByEmail = {};
  for (const u of usersData) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        countryId: u.countryId,
        name: u.name,
        email: u.email,
        passwordHash,
        level: u.level,
        orgRole: u.orgRole,
        userFunctions: {
          create: u.functions.map((code) => ({ functionCode: code })),
        },
      },
    });
    usersByEmail[u.email] = created.id;
  }
  console.log(`✅ ${usersData.length} utilisateurs (mot de passe : password123)`);

  // ----------------------------------------------------------
  // 5. APPARTENANCES AUX GTT (TwgMember) — rôle nommé des personnes
  // ----------------------------------------------------------
  const memberships = [
    { email: 'a.belkacem@anpp.dz',        twgId: 'ma-twg',  role: 'lead' },
    { email: 's.kaddour@anpp.dz',         twgId: 'ma-twg',  role: 'member' },
    { email: 'h.elsayed@edaegypt.gov.eg', twgId: 'gmp-twg', role: 'lead' },
    { email: 'h.elsayed@edaegypt.gov.eg', twgId: 'ims-twg', role: 'colead' },
    { email: 'k.fathy@edaegypt.gov.eg',   twgId: 'qms-twg', role: 'colead' },
    { email: 'k.fathy@edaegypt.gov.eg',   twgId: 'pv-twg',  role: 'lead' },
    { email: 'm.saleh@fdcc.ly',           twgId: 'gmp-twg', role: 'colead' },
    { email: 'f.sidi@sante.gov.mr',       twgId: 'ma-twg',  role: 'colead' },
    { email: 'y.alaoui@ammps.gov.ma',     twgId: 'qms-twg', role: 'lead' },
    { email: 'o.bennis@ammps.gov.ma',     twgId: 'qms-twg', role: 'member' },
    { email: 'm.aounallah@anmps.tn',      twgId: 'ims-twg', role: 'lead' },
    { email: 'm.aounallah@anmps.tn',      twgId: 'pv-twg',  role: 'colead' },
    { email: 'w.trabelsi@anmps.tn',       twgId: 'ims-twg', role: 'member' },
  ];
  for (const m of memberships) {
    await prisma.twgMember.upsert({
      where: { userId_twgId: { userId: usersByEmail[m.email], twgId: m.twgId } },
      update: {},
      create: { userId: usersByEmail[m.email], twgId: m.twgId, role: m.role },
    });
  }
  console.log(`✅ ${memberships.length} appartenances aux GTT`);

  // ----------------------------------------------------------
  // 6. DOCUMENTS (5)  — un par statut du circuit documentaire
  // ----------------------------------------------------------
  const amine = usersByEmail['a.belkacem@anpp.dz'];
  const heba  = usersByEmail['h.elsayed@edaegypt.gov.eg'];
  const yasmine = usersByEmail['y.alaoui@ammps.gov.ma'];
  const mariam = usersByEmail['m.aounallah@anmps.tn'];
  const karim = usersByEmail['k.fathy@edaegypt.gov.eg'];

  const documents = [
    { twgId: 'ma-twg',  titleFr: "Grille d'évaluation harmonisée — dossiers génériques", titleEn: 'Harmonised assessment grid — generic dossiers', titleAr: 'شبكة تقييم موحدة — ملفات الأدوية الجنيسة',
      category: 'guideline', phase: 1, visibility: 'internal', status: 'draft_twg', version: '1.0', createdById: amine },
    { twgId: 'gmp-twg', titleFr: "Procédure d'inspection conjointe — sites stériles", titleEn: 'Joint inspection procedure — sterile sites', titleAr: 'إجراء التفتيش المشترك — مواقع التصنيع المعقم',
      category: 'sop', phase: 1, visibility: 'internal', status: 'received_secretariat', version: '1.0', createdById: heba },
    { twgId: 'qms-twg', titleFr: 'Politique régionale de gestion documentaire', titleEn: 'Regional document management policy', titleAr: 'السياسة الإقليمية لإدارة الوثائق',
      category: 'guideline', phase: 2, visibility: 'internal', status: 'pending_steering', version: '1.1',
      validatedByBody: 'secretariat', validatedById: mariam, validatedAt: new Date('2026-08-19'), createdById: yasmine },
    { twgId: 'ims-twg', titleFr: 'Cartographie des systèmes nationaux RIMS', titleEn: 'National RIMS systems mapping', titleAr: 'مسح أنظمة RIMS الوطنية',
      category: 'report', phase: 1, visibility: 'internal', status: 'distributed_internal', version: '1.0',
      validatedByBody: 'secretariat', validatedById: mariam, validatedAt: new Date('2026-08-05'), createdById: mariam },
    { twgId: 'pv-twg',  titleFr: 'Guide de reliance régionale', titleEn: 'Regional Reliance Guideline', titleAr: 'دليل الاعتماد التبادلي الإقليمي',
      category: 'guideline', phase: 3, visibility: 'public', status: 'published_public', version: '2.0',
      validatedByBody: 'steering_committee', validatedById: karim, validatedAt: new Date('2026-07-20'), createdById: karim },
  ];
  for (const d of documents) {
    const doc = await prisma.document.create({ data: d });
    // une première version dans l'historique + un événement de création
    await prisma.documentVersion.create({
      data: { documentId: doc.id, version: d.version, note: 'Version initiale (seed)', createdById: d.createdById },
    });
    await prisma.documentEvent.create({
      data: { documentId: doc.id, type: 'created', actorId: d.createdById, toStatus: d.status, note: 'Créé via seed' },
    });
  }
  console.log(`✅ ${documents.length} documents (avec version + événement)`);

  // ----------------------------------------------------------
  // 7. ACTUALITÉS (3)
  // ----------------------------------------------------------
  const news = [
    { dateFr: 'Sept. 2026', dateEn: 'Sep 2026', dateAr: 'سبتمبر 2026', sortDate: new Date('2026-09-01'),
      titleFr: '15ᵉ réunion des RECs-MRH, Tunis', titleEn: '15th RECs-MRH Meeting, Tunis', titleAr: 'الاجتماع الخامس عشر لـ RECs-MRH، تونس',
      bodyFr: 'La région Afrique du Nord présente son premier bilan annuel devant les autres CER du continent.',
      bodyEn: 'The North Africa region presents its first annual review to the continent\'s other RECs.',
      bodyAr: 'تقدّم منطقة شمال إفريقيا حصيلتها السنوية الأولى أمام باقي المجموعات الاقتصادية الإقليمية في القارة.',
      publishedAt: new Date('2026-09-01') },
    { dateFr: 'Sept. 2026', dateEn: 'Sep 2026', dateAr: 'سبتمبر 2026', sortDate: new Date('2026-09-15'),
      titleFr: 'Lancement du projet REC-RIMS régional', titleEn: 'Launch of the regional REC-RIMS project', titleAr: 'إطلاق مشروع نظام REC-RIMS الإقليمي',
      bodyFr: 'Premier outil numérique commun aux ANR de la région pour le suivi des activités réglementaires.',
      bodyEn: 'First digital tool shared by the region\'s NRAs to track regulatory activities.',
      bodyAr: 'أول أداة رقمية مشتركة بين الهيئات التنظيمية الوطنية في المنطقة لمتابعة الأنشطة التنظيمية.',
      publishedAt: new Date('2026-09-15') },
    { dateFr: 'Mai 2026', dateEn: 'May 2026', dateAr: 'مايو 2026', sortDate: new Date('2026-05-01'),
      titleFr: 'Enquête OMS sur les besoins en formation', titleEn: 'WHO training-needs survey', titleAr: 'استطلاع منظمة الصحة العالمية لاحتياجات التدريب',
      bodyFr: 'Achevée dans les ANR de la région ; les résultats alimentent le plan de renforcement des capacités 2027.',
      bodyEn: 'Completed across the region\'s NRAs; results feed the 2027 capacity-building plan.',
      bodyAr: 'اكتمل في الهيئات التنظيمية الوطنية في المنطقة، وتغذي نتائجه خطة بناء القدرات لعام 2027.',
      publishedAt: new Date('2026-05-01') },
  ];
  for (const n of news) {
    await prisma.news.create({ data: n });
  }
  console.log(`✅ ${news.length} actualités`);

  // ----------------------------------------------------------
  // 8. RÉCLAMATION (1, exemple)
  // ----------------------------------------------------------
  await prisma.complaint.create({
    data: {
      name: 'Amira Larbi', email: 'a.larbi@example.dz', org: 'Industrie pharmaceutique locale',
      countryId: 'dz', nature: 'delay', status: 'resolved',
      message: 'Délai de retour important sur une demande d\'avis technique adressée au Secrétariat.',
      response: 'Demande traitée ; procédure de réponse accélérée mise en place.', respondedAt: new Date('2026-08-25'),
      handledById: mariam,
    },
  });
  console.log('✅ 1 réclamation');

  console.log('🎉 Seed de démonstration terminé.');
}

main()
  .catch((e) => { console.error('❌ Erreur pendant le seed :', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });