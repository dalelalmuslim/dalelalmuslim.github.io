# Phase 2 — D1 Public Content Foundation

## الهدف

نقل `public content API` من `local-backed scaffold` إلى `D1-backed repository path` بدون rewrite.

## ما تم إنشاؤه

- `d1/migrations/0001_public_content_schema.sql`
- `d1/seed/public-content.seed.json`
- `d1/seed/0001_public_content_seed.sql`
- `functions/_shared/public-content-d1.js`
- `functions/_shared/public-content-local.js`
- `tools/generate-d1-public-content-seed.mjs`

## نموذج التخزين

القرار المعماري الحالي **document-oriented** وليس relational كامل.

السبب:

- عندنا 5 public sections فقط.
- المطلوب الآن هو source-of-truth + versioning + publish/rollback path.
- التطبيع الكامل الآن سيكون over-engineering ويؤخر Phase 2 بدون عائد عملي مكافئ.

## الجداول

### `public_content_documents`

تحتفظ بكل نسخة محفوظة من payload لكل section.

الأعمدة الأساسية:

- `section_id`
- `version`
- `payload_json`
- `payload_hash`
- `schema_version`
- `source_kind`
- `created_at`

### `public_content_publications`

تحدد النسخة المنشورة الحالية لكل section.

الأعمدة الأساسية:

- `section_id`
- `version`
- `published_at`
- `published_by`
- `notes`

## سلوك الـ API بعد هذه الدفعة

- إذا وُجد binding صالح لـ D1:
  - `GET /api/public/versions` يقرأ الإصدارات المنشورة من D1.
  - `GET /api/public/content/*` يقرأ payload المنشور من D1.
- إذا لم يوجد binding أو فشل query:
  - يحصل fallback إلى local baseline الحالي.

## أوامر العمل

### توليد seed من baseline المحلي

```bash
npm run generate:d1-seed
```

### تشغيل migrations على قاعدة D1

```bash
npx wrangler d1 migrations apply <DATABASE_NAME>
```

### استيراد seed الأولي

```bash
npx wrangler d1 execute <DATABASE_NAME> --file d1/seed/0001_public_content_seed.sql
```

## ملاحظات تشغيلية

- لا يتم افتراض اسم binding واحد فقط؛ الكود يبحث عن:
  - `PUBLIC_CONTENT_DB`
  - `DALIL_CONTENT_DB`
  - `DB`
- يفضّل تثبيت binding واحد صريح: `PUBLIC_CONTENT_DB`.
- ما زال النشر الحي يحتاج إضافة binding فعلية داخل Cloudflare Pages project.
