// ============================================================
// NA-MRH — prisma/seed.js  (compatible Prisma 7 — driver adapter)
// Peuple la base avec les données de référence de la maquette.
//
// À placer dans : server/prisma/seed.js
//
// Pré-requis (une seule fois) :
//   npm install bcryptjs @prisma/adapter-pg dotenv
//
// Lancement :
//   node prisma/seed.js
//
// NOTE MOTS DE PASSE (dev local uniquement) :
//   Tous les utilisateurs de test ont le mot de passe : "password123"
//   Il est haché avec bcrypt avant insertion. En clair ici pour vos tests.
// ============================================================

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

// Prisma 7 : la connexion passe par un "driver adapter", plus par DATABASE_URL seul.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Démarrage du seed...');

  // Mot de passe commun à tous les comptes de test : "password123"
  const passwordHash = await bcrypt.hash('password123', 10);

  // ----------------------------------------------------------
  // 1. FONCTIONS RÉGLEMENTAIRES (12)
  // ----------------------------------------------------------
  const functions = [
    { code: 'MA',  labelFr: 'Homologation',                        labelEn: 'Marketing Authorisation',        labelAr: 'التسجيل والترخيص' },
    { code: 'GMP', labelFr: 'Inspection BPF',                      labelEn: 'GMP Inspection',                 labelAr: 'تفتيش BPF' },
    { code: 'IMS', labelFr: "Système d'information",               labelEn: 'Information System',              labelAr: 'نظام المعلومات' },
    { code: 'QMS', labelFr: 'Système qualité',                     labelEn: 'Quality System',                 labelAr: 'نظام الجودة' },
    { code: 'PV',  labelFr: 'Pharmacovigilance',                   labelEn: 'Pharmacovigilance',              labelAr: 'اليقظة الدوائية' },
    { code: 'MD',  labelFr: 'Enregistrement des dispositifs médicaux', labelEn: 'Medical Devices Registration', labelAr: 'تسجيل الأجهزة الطبية' },
    { code: 'MS',  labelFr: 'Surveillance du marché',              labelEn: 'Market Surveillance',            labelAr: 'مراقبة السوق' },
    { code: 'CT',  labelFr: 'Essais cliniques',                    labelEn: 'Clinical Trials Oversight',      labelAr: 'الإشراف على التجارب السريرية' },
    { code: 'IMP', labelFr: 'Contrôle import/export',              labelEn: 'Import/Export Control',          labelAr: 'مراقبة الاستيراد والتصدير' },
    { code: 'LAB', labelFr: 'Contrôle qualité en laboratoire',     labelEn: 'Laboratory Quality Control',     labelAr: 'مراقبة الجودة المخبرية' },
    { code: 'LIC', labelFr: 'Autorisation des officines & grossistes', labelEn: 'Licensing — Pharmacies & Wholesalers', labelAr: 'ترخيص الصيدليات وموزعي الجملة' },
    { code: 'ADV', labelFr: 'Contrôle de la publicité',            labelEn: 'Advertising Control',            labelAr: 'مراقبة الإعلان الدوائي' },
  ];
  for (const f of functions) {
    await prisma.function.upsert({ where: { code: f.code }, update: {}, create: f });
  }
  console.log(`✅ ${functions.length} fonctions réglementaires`);

  // ----------------------------------------------------------
  // 2. PAYS (6)  — orgRole = rôle institutionnel dans NA-MRH
  // ----------------------------------------------------------
  const countries = [
    { id: 'dz', nameFr: 'Algérie',    nameEn: 'Algeria',    nameAr: 'الجزائر',
      nraNameFr: 'Agence Nationale des Produits Pharmaceutiques (ANPP)', nraNameEn: 'National Agency of Pharmaceutical Products (ANPP)', nraNameAr: 'الوكالة الوطنية للمنتجات الصيدلانية',
      email: 'direction_generale@anpp.dz', phone: '+213 23 36 75 22', website: 'https://anpp.dz', orgRole: 'president' },
    { id: 'eg', nameFr: 'Égypte',     nameEn: 'Egypt',      nameAr: 'مصر',
      nraNameFr: 'Egyptian Drug Authority (EDA)', nraNameEn: 'Egyptian Drug Authority (EDA)', nraNameAr: 'هيئة الدواء المصرية',
      email: 'info@edaegypt.gov.eg', phone: '+20 2 2368 4288', website: 'https://edaegypt.gov.eg', orgRole: 'member' },
    { id: 'ly', nameFr: 'Libye',      nameEn: 'Libya',      nameAr: 'ليبيا',
      nraNameFr: 'National Food & Drug Control Centre (FDCC)', nraNameEn: 'National Food & Drug Control Centre (FDCC)', nraNameAr: 'المركز الوطني لرقابة الغذاء والدواء',
      email: 'info@fdcc.ly', phone: '+218 21 444 1491', website: 'https://www.fdcc.ly', orgRole: 'member' },
    { id: 'mr', nameFr: 'Mauritanie', nameEn: 'Mauritania', nameAr: 'موريتانيا',
      nraNameFr: 'Direction de la Pharmacie et des Laboratoires (DPL) — Ministère de la Santé', nraNameEn: 'Directorate of Pharmacy and Laboratories (DPL) — Ministry of Health', nraNameAr: 'إدارة الصيدلة والمخابر — وزارة الصحة',
      email: null, phone: null, website: 'https://www.sante.gov.mr', orgRole: 'member' },
    { id: 'ma', nameFr: 'Maroc',      nameEn: 'Morocco',    nameAr: 'المغرب',
      nraNameFr: 'Agence Marocaine du Médicament et des Produits de Santé (AMMPS)', nraNameEn: 'Moroccan Agency of Medicines and Health Products (AMMPS)', nraNameAr: 'الوكالة المغربية للدواء والمنتجات الصحية',
      email: 'contact@ammps.gov.ma', phone: '+212 537 68 22 89', website: 'https://ammps.sante.gov.ma', orgRole: 'vice_president' },
    { id: 'tn', nameFr: 'Tunisie',    nameEn: 'Tunisia',    nameAr: 'تونس',
      nraNameFr: 'Agence Nationale du Médicament et des Produits de Santé (ANMPS) — hôte du Secrétariat NA-MRH', nraNameEn: 'National Agency of Medicines and Health Products (ANMPS) — NA-MRH Secretariat host', nraNameAr: 'الوكالة الوطنية للأدوية والمنتجات الصحية — المقر المستضيف لأمانة NA-MRH',
      email: 'dpm@rns.tn', phone: '+216 71 78 31 95', website: 'https://portail.anmps.tn', orgRole: 'secretariat' },
  ];
  for (const c of countries) {
    await prisma.country.upsert({ where: { id: c.id }, update: {}, create: c });
  }
  console.log(`✅ ${countries.length} pays`);

  // ----------------------------------------------------------
  // 3. GROUPES DE TRAVAIL (5)  — id = slug, functionCode + lead/colead
  // ----------------------------------------------------------
  const twgs = [
    { id: 'ma-twg',  nameFr: 'Homologation / Autorisation de Mise sur le Marché', nameEn: 'Marketing Authorisation', nameAr: 'التسجيل والترخيص',
      descFr: 'Définit le périmètre régional des évaluations conjointes, la ligne directrice générale et le guide de reliance.',
      descEn: 'Defines the regional scope of joint assessments, the general guideline and the reliance guide.',
      descAr: 'يحدد النطاق الإقليمي للتقييمات المشتركة والدليل العام ودليل الاعتماد التبادلي.',
      wave: 1, functionCode: 'MA', leadCountryId: 'dz', coleadCountryId: 'mr' },
    { id: 'gmp-twg', nameFr: 'Inspection BPF (Bonnes Pratiques de Fabrication)', nameEn: 'GMP Inspection', nameAr: 'تفتيش الممارسات الجيدة للتصنيع',
      descFr: 'Construit la procédure et le vivier d\'inspecteurs pour les inspections conjointes de sites de fabrication.',
      descEn: 'Builds the procedure and the pool of inspectors for joint manufacturing-site inspections.',
      descAr: 'يضع الإجراء ومجموعة المفتشين للتفتيش المشترك لمواقع التصنيع.',
      wave: 1, functionCode: 'GMP', leadCountryId: 'eg', coleadCountryId: 'ly' },
    { id: 'ims-twg', nameFr: "Système d'Information (IMS)", nameEn: 'Information Management System (IMS)', nameAr: 'نظام المعلومات',
      descFr: 'Pilote le REC-RIMS régional, la cartographie des systèmes nationaux et le futur site NA-MRH.',
      descEn: 'Leads the regional REC-RIMS, the mapping of national systems and the future NA-MRH site.',
      descAr: 'يقود نظام REC-RIMS الإقليمي، ومسح الأنظمة الوطنية، والموقع المستقبلي لـ NA-MRH.',
      wave: 1, functionCode: 'IMS', leadCountryId: 'tn', coleadCountryId: 'eg' },
    { id: 'qms-twg', nameFr: 'Système de Management de la Qualité (SMQ)', nameEn: 'Quality Management System (QMS)', nameAr: 'نظام إدارة الجودة',
      descFr: 'A livré le mandat (ToR) et la procédure de gestion documentaire, désormais en revue par les ANR.',
      descEn: 'Delivered the mandate (ToR) and the document management procedure, now under NRA review.',
      descAr: 'سلّم الاختصاصات وإجراء إدارة الوثائق، وهي الآن قيد المراجعة من الهيئات الوطنية.',
      wave: 2, functionCode: 'QMS', leadCountryId: 'ma', coleadCountryId: 'eg' },
    { id: 'pv-twg',  nameFr: 'Pharmacovigilance', nameEn: 'Pharmacovigilance', nameAr: 'اليقظة الدوائية',
      descFr: 'Prépare l\'échange de données de pharmacovigilance entre systèmes nationaux.',
      descEn: 'Prepares the exchange of pharmacovigilance data between national systems.',
      descAr: 'يُعِدّ لتبادل بيانات اليقظة الدوائية بين الأنظمة الوطنية.',
      wave: 2, functionCode: 'PV', leadCountryId: 'eg', coleadCountryId: 'tn' },
  ];
  for (const w of twgs) {
    await prisma.twg.upsert({ where: { id: w.id }, update: {}, create: w });
  }
  console.log(`✅ ${twgs.length} groupes de travail`);

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

  console.log('🎉 Seed terminé avec succès !');
}

main()
  .catch((e) => { console.error('❌ Erreur pendant le seed :', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });