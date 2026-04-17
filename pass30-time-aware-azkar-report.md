# Pass 30 — Time-Aware Azkar Ordering (Lightweight)

## Scope
تنفيذ ترتيب/إبراز خفيف لقسم الأذكار **باستخدام الموجود حاليًا** داخل المشروع، بدون إدخال محرك مواقيت صلاة جديد.

## What changed

### 1) Time context refinement
تم تعديل `js/domains/azkar/azkar-selectors.js` بحيث أصبح الفرز يعتمد على 4 سياقات بسيطة:
- morning
- day
- evening
- late-night

والأولوية الآن:
- **الصباح:** morning → wakeup → prayer
- **اليوم:** prayer → morning → evening
- **المساء:** evening → sleep → prayer
- **آخر الليل:** sleep → evening → wakeup

هذا يحقق طلب:
- إبراز أذكار الصباح صباحًا
- إبراز أذكار المساء والنوم ليلًا
- بدون ربط مع كل صلاة على حدة

### 2) Sorting priority cleanup
تم تعديل tuple الفرز بحيث يصبح **الوقت المقترح** أقوى من المفضلة/آخر زيارة بعد الجلسة النشطة، مع إبقاء المكتمل اليوم في مرتبة أدنى.

### 3) Category card UI touch
تم توسيع template والrenderer والـ CSS لإضافة:
- period eyebrow (مثل: الصباح / المساء / قبل النوم)
- state chip خفيفة:
  - الأنسب الآن
  - تابع
  - تم اليوم
- accent tone من manifest
- top color bar خفيف حسب نوع التصنيف

### 4) Lightweight visual polish
تم تحسين:
- grid sizing
- card hierarchy
- icon surfaces
- recommended state styling
- completed state styling

بدون إعادة الزحام القديم.

## Files changed
- `js/domains/azkar/azkar-selectors.js`
- `js/features/azkar/azkar-grid-renderers.js`
- `src/index-fragments/templates.html`
- `css/features/azkar.css`
- regenerated `index.html`
- regenerated `sw-manifest.js`

## Important note
**لم يتم إدخال prayer-times engine جديد.**
التنفيذ مبني فقط على:
- الوقت الحالي من النظام
- `period` الموجود أصلًا داخل manifest
- smart ordering الموجود في domain

## Daily reset
تمت مراجعة هذه النقطة وتركها كما هي لأن reset اليومي موجود بالفعل في:
- `js/services/storage/storage-reset-policy.js`

ويقوم بتصفير progress اليومية عند بداية يوم جديد.

## Verification
نجح بعد التنفيذ:
- `node tools/build-static-shell.mjs`
- `node tools/verify-browser-module-graph.mjs`
- `node tools/verify-dom-safety.mjs`
- `node tools/verify-external-boundaries.mjs`
- `node tools/verify-startup-dependencies.mjs`
- `node tools/verify-feature-startup-plan.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`
- `node day_cycle_validation_gate.mjs`

## Verdict
Pass 30 نجح.

النتيجة الحالية:
- القسم ما زال بسيطًا
- لكنه أصبح أذكى زمنيًا
- وفيه لمسة بصرية خفيفة للكروت
- بدون إدخال تعقيد جديد أو ربط زائد بالتوقيت
