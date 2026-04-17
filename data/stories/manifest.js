// @ts-nocheck
const STORY_MANIFEST = Object.freeze([
  {
    slug: 'moral-stories',
    title: 'قصص تربوية وعامة',
    description: 'قصص قصيرة وعبر عملية عن الأخلاق والإيمان ومواقف الحياة اليومية.',
    icon: 'fa-seedling',
    accentTone: 'emerald',
    sortOrder: 10,
    estimatedMinutes: 8,
    group: 'morals',
    isFeatured: true
  },
  {
    slug: 'prophets-stories',
    title: 'قصص الأنبياء',
    description: 'مواقف ملهمة من قصص الأنبياء وما تحمله من هداية وثبات.',
    icon: 'fa-book-quran',
    accentTone: 'gold',
    sortOrder: 20,
    estimatedMinutes: 10,
    group: 'prophets',
    isFeatured: true
  },
  {
    slug: 'companions-stories',
    title: 'قصص الصحابة',
    description: 'نماذج من مواقف الصحابة في الصدق والصبر والبذل والثبات.',
    icon: 'fa-people-group',
    accentTone: 'teal',
    sortOrder: 30,
    estimatedMinutes: 9,
    group: 'companions',
    isFeatured: true
  }
]);

const MANIFEST_MAP = Object.freeze(
  Object.fromEntries(STORY_MANIFEST.flatMap((entry) => [
    [entry.slug, entry],
    [entry.title, entry]
  ]))
);

export function getStoriesManifest() {
  return STORY_MANIFEST;
}

export function getStoryManifestEntryByKey(value) {
  const key = typeof value === 'string'
    ? value.trim()
    : value?.slug || value?.title || '';
  if (!key) return null;
  return MANIFEST_MAP[key] || null;
}

export function resolveStoryCategorySlug(value) {
  const entry = getStoryManifestEntryByKey(value);
  if (entry) return entry.slug;
  if (!value) return '';
  const raw = typeof value === 'string' ? value : value?.slug || value?.title || '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w؀-ۿ-]/g, '')
    .replace(/-+/g, '-');
}

export default STORY_MANIFEST;
