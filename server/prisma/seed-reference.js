// ============================================================
// NA-MRH — prisma/seed-reference.js
// Données de RÉFÉRENCE : sûr pour la production.
//
//   - 12 fonctions réglementaires (les GTT y sont liés par clé
//     étrangère : sans elles, les GTT ne peuvent pas être créés) ;
//   - 6 pays membres (noms, ANR, coordonnées publiques) ;
//   - 5 groupes de travail techniques (noms, descriptions, fonction,
//     pays lead / co-lead).
//
// AUCUN utilisateur, AUCUN mot de passe, aucune donnée de démonstration.
//
// ⚠️ NE JAMAIS ÉCRASER : pays et GTT sont ensuite modifiés par le
// Secrétariat (coordonnées, descriptions). Chaque enregistrement est donc
// créé UNIQUEMENT s'il n'existe pas (upsert avec update: {}). Relancer ce
// script est sans danger : ce qui existe déjà n'est pas touché, même si
// les valeurs ci-dessous diffèrent de celles en base.
//
// Lancement :  npm run seed:reference   (ou node prisma/seed-reference.js)
// ============================================================

const { parseDatabaseUrl, createPrisma } = require('./script-utils');

const target = parseDatabaseUrl();
const prisma = createPrisma();

// Crée l'enregistrement s'il manque, ne modifie JAMAIS un existant.
// Renvoie true si l'enregistrement a été créé.
async function createIfMissing(model, where, data) {
  const existing = await prisma[model].findUnique({ where });
  if (existing) return false;
  await prisma[model].upsert({ where, update: {}, create: data });
  return true;
}

async function seedAll(label, model, items, keyOf) {
  let created = 0;
  for (const item of items) {
    if (await createIfMissing(model, keyOf(item), item)) created += 1;
  }
  console.log(`✅ ${label} : ${created} créé(s), ${items.length - created} déjà présent(s), non modifié(s)`);
}

async function main() {
  console.log(`🌱 Seed de référence — base : ${target.label}`);

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
  await seedAll('Fonctions réglementaires', 'function', functions, (f) => ({ code: f.code }));

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
  await seedAll('Pays', 'country', countries, (c) => ({ id: c.id }));

  // ----------------------------------------------------------
  // 3. GROUPES DE TRAVAIL (5)  — id = slug, functionCode + lead/colead
  // ----------------------------------------------------------
  // LEGACY_TWG_WAVE : la colonne `wave` est obligatoire en base mais n'est
  // plus utilisée ; même valeur pour tous les groupes.
  const LEGACY_TWG_WAVE = 1;
  const twgs = [
    { id: 'ma-twg',  nameFr: 'Homologation / Autorisation de Mise sur le Marché', nameEn: 'Marketing Authorisation', nameAr: 'التسجيل والترخيص',
      descFr: 'Définit le périmètre régional des évaluations conjointes, la ligne directrice générale et le guide de reliance.',
      descEn: 'Defines the regional scope of joint assessments, the general guideline and the reliance guide.',
      descAr: 'يحدد النطاق الإقليمي للتقييمات المشتركة والدليل العام ودليل الاعتماد التبادلي.',
      wave: LEGACY_TWG_WAVE, functionCode: 'MA', leadCountryId: 'dz', coleadCountryId: 'mr' },
    { id: 'gmp-twg', nameFr: 'Inspection BPF (Bonnes Pratiques de Fabrication)', nameEn: 'GMP Inspection', nameAr: 'تفتيش الممارسات الجيدة للتصنيع',
      descFr: 'Construit la procédure et le vivier d\'inspecteurs pour les inspections conjointes de sites de fabrication.',
      descEn: 'Builds the procedure and the pool of inspectors for joint manufacturing-site inspections.',
      descAr: 'يضع الإجراء ومجموعة المفتشين للتفتيش المشترك لمواقع التصنيع.',
      wave: LEGACY_TWG_WAVE, functionCode: 'GMP', leadCountryId: 'eg', coleadCountryId: 'ly' },
    { id: 'ims-twg', nameFr: "Système d'Information (IMS)", nameEn: 'Information Management System (IMS)', nameAr: 'نظام المعلومات',
      descFr: 'Pilote le REC-RIMS régional, la cartographie des systèmes nationaux et le futur site NA-MRH.',
      descEn: 'Leads the regional REC-RIMS, the mapping of national systems and the future NA-MRH site.',
      descAr: 'يقود نظام REC-RIMS الإقليمي، ومسح الأنظمة الوطنية، والموقع المستقبلي لـ NA-MRH.',
      wave: LEGACY_TWG_WAVE, functionCode: 'IMS', leadCountryId: 'tn', coleadCountryId: 'eg' },
    { id: 'qms-twg', nameFr: 'Système de Management de la Qualité (SMQ)', nameEn: 'Quality Management System (QMS)', nameAr: 'نظام إدارة الجودة',
      descFr: 'A livré le mandat (ToR) et la procédure de gestion documentaire, désormais en revue par les ANR.',
      descEn: 'Delivered the mandate (ToR) and the document management procedure, now under NRA review.',
      descAr: 'سلّم الاختصاصات وإجراء إدارة الوثائق، وهي الآن قيد المراجعة من الهيئات الوطنية.',
      wave: LEGACY_TWG_WAVE, functionCode: 'QMS', leadCountryId: 'ma', coleadCountryId: 'eg' },
    { id: 'pv-twg',  nameFr: 'Pharmacovigilance', nameEn: 'Pharmacovigilance', nameAr: 'اليقظة الدوائية',
      descFr: 'Prépare l\'échange de données de pharmacovigilance entre systèmes nationaux.',
      descEn: 'Prepares the exchange of pharmacovigilance data between national systems.',
      descAr: 'يُعِدّ لتبادل بيانات اليقظة الدوائية بين الأنظمة الوطنية.',
      wave: LEGACY_TWG_WAVE, functionCode: 'PV', leadCountryId: 'eg', coleadCountryId: 'tn' },
  ];
  await seedAll('Groupes de travail', 'twg', twgs, (w) => ({ id: w.id }));

  console.log('🎉 Seed de référence terminé.');
}

main()
  .catch((e) => { console.error('❌ Erreur pendant le seed de référence :', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

