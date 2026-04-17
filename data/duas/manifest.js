// @ts-nocheck
const DUA_MANIFEST = Object.freeze([
  {
    slug: 'quran-duas',
    title: 'أدعية من القرآن',
    description: 'أدعية قرآنية جامعة للثبات والهداية والرحمة.',
    icon: 'fa-book-quran',
    accentTone: 'emerald',
    sortOrder: 10,
    estimatedMinutes: 4,
    sourceType: 'quran',
    group: 'featured',
    isFeatured: true
  },
  {
    slug: 'distress-and-debt',
    title: 'الكرب والهم وقضاء الدين',
    description: 'أدعية للطمأنينة وكشف الضيق وتفريج الكرب.',
    icon: 'fa-heart-circle-bolt',
    accentTone: 'indigo',
    sortOrder: 20,
    estimatedMinutes: 3,
    sourceType: 'hadith',
    group: 'relief',
    isFeatured: true
  },
  {
    slug: 'protection-and-fortification',
    title: 'الحماية والتحصين',
    description: 'أدعية التحصين والحفظ والاستعاذة بالله.',
    icon: 'fa-shield-heart',
    accentTone: 'teal',
    sortOrder: 30,
    estimatedMinutes: 3,
    sourceType: 'mixed',
    group: 'protection',
    isFeatured: true
  },
  {
    slug: 'forgiveness-and-repentance',
    title: 'طلب المغفرة والتوبة',
    description: 'أدعية الاستغفار والرجوع إلى الله برفق وخشوع.',
    icon: 'fa-hand-sparkles',
    accentTone: 'gold',
    sortOrder: 40,
    estimatedMinutes: 3,
    sourceType: 'hadith',
    group: 'spiritual',
    isFeatured: true
  },
  {
    slug: 'rizq-and-blessing',
    title: 'الرزق والبركة',
    description: 'أدعية البركة والرزق الحلال والتيسير.',
    icon: 'fa-seedling',
    accentTone: 'olive',
    sortOrder: 50,
    estimatedMinutes: 3,
    sourceType: 'mixed',
    group: 'life',
    isFeatured: true
  },
  {
    slug: 'mercy-guidance-and-steadfastness',
    title: 'الرحمة والثبات والهداية',
    description: 'أدعية طلب الرحمة والثبات على الحق والهداية.',
    icon: 'fa-compass-drafting',
    accentTone: 'blue',
    sortOrder: 60,
    estimatedMinutes: 4,
    sourceType: 'mixed',
    group: 'spiritual',
    isFeatured: true
  },
  {
    slug: 'general-duas',
    title: 'أدعية عامة',
    description: 'أدعية جامعة تصلح في أوقات كثيرة من اليوم.',
    icon: 'fa-sparkles',
    accentTone: 'violet',
    sortOrder: 70,
    estimatedMinutes: 4,
    sourceType: 'mixed',
    group: 'general',
    isFeatured: false
  },
  {
    slug: 'akhirah-and-jannah',
    title: 'الجنة والنار والآخرة',
    description: 'أدعية النجاة والفوز والرجاء فيما عند الله.',
    icon: 'fa-cloud-sun',
    accentTone: 'amber',
    sortOrder: 80,
    estimatedMinutes: 3,
    sourceType: 'mixed',
    group: 'akhirah',
    isFeatured: false
  },
  {
    slug: 'dunya-and-akhirah',
    title: 'الدنيا والآخرة والخير',
    description: 'أدعية جامعة لخيري الدنيا والآخرة.',
    icon: 'fa-globe',
    accentTone: 'cyan',
    sortOrder: 90,
    estimatedMinutes: 3,
    sourceType: 'mixed',
    group: 'general',
    isFeatured: false
  },
  {
    slug: 'character-and-righteousness',
    title: 'الأخلاق والصلاح',
    description: 'أدعية صلاح القلب والخلق والعمل.',
    icon: 'fa-hands-holding-heart',
    accentTone: 'rose',
    sortOrder: 100,
    estimatedMinutes: 3,
    sourceType: 'hadith',
    group: 'character',
    isFeatured: false
  },
  {
    slug: 'health-and-healing',
    title: 'الصحة والشفاء',
    description: 'أدعية الشفاء والعافية والستر والسلامة.',
    icon: 'fa-briefcase-medical',
    accentTone: 'red',
    sortOrder: 110,
    estimatedMinutes: 3,
    sourceType: 'mixed',
    group: 'wellbeing',
    isFeatured: true
  },
  {
    slug: 'travel-and-road-rizq',
    title: 'السفر والرزق في الطريق',
    description: 'أدعية السفر والحفظ والرزق في الأسفار.',
    icon: 'fa-plane-departure',
    accentTone: 'sky',
    sortOrder: 120,
    estimatedMinutes: 2,
    sourceType: 'mixed',
    group: 'life',
    isFeatured: false
  },
  {
    slug: 'family-and-children',
    title: 'الأهل والذرية',
    description: 'أدعية للأهل والأبناء والصلاح والسكينة.',
    icon: 'fa-people-roof',
    accentTone: 'pink',
    sortOrder: 130,
    estimatedMinutes: 3,
    sourceType: 'mixed',
    group: 'family',
    isFeatured: false
  },
  {
    slug: 'prayer-and-worship',
    title: 'الصلاة والعبادة',
    description: 'أدعية الخشوع والعبادة والقرب من الله.',
    icon: 'fa-person-praying',
    accentTone: 'indigo',
    sortOrder: 140,
    estimatedMinutes: 3,
    sourceType: 'mixed',
    group: 'worship',
    isFeatured: false
  },
  {
    slug: 'knowledge-and-understanding',
    title: 'العلم والفهم',
    description: 'أدعية العلم والنفع والفهم والتوفيق.',
    icon: 'fa-lightbulb',
    accentTone: 'gold',
    sortOrder: 150,
    estimatedMinutes: 2,
    sourceType: 'mixed',
    group: 'knowledge',
    isFeatured: false
  }
]);

const MANIFEST_MAP = Object.freeze(
  Object.fromEntries(DUA_MANIFEST.flatMap(entry => [
    [entry.slug, entry],
    [entry.title, entry]
  ]))
);

const SLUG_ALIASES = Object.freeze(
  Object.fromEntries(DUA_MANIFEST.map(entry => [entry.title, entry.slug]))
);

export function getDuasManifest() {
  return DUA_MANIFEST;
}

export function resolveDuaSlug(value) {
  if (!value) return '';
  const key = typeof value === 'string' ? value.trim() : value?.slug || value?.title || '';
  if (!key) return '';
  return MANIFEST_MAP[key]?.slug || SLUG_ALIASES[key] || '';
}

export function getDuaManifestEntryByKey(value) {
  const key = typeof value === 'string' ? value.trim() : value?.slug || value?.title || '';
  if (!key) return null;
  return MANIFEST_MAP[key] || null;
}

export default DUA_MANIFEST;
