# Phase 17 — Service Worker 2.0

## الهدف
الانتقال من `sw.js` تعمل بمنطق fetch conditionals متفرقة إلى Service Worker **policy-driven** وقريبة من فكر Workbox، لكن بدون فرض bundler أو Workbox package على مشروع static HTML-first.

## المبادئ
- المشروع يبقى `index.html` driven وسهل التشغيل على الهاتف.
- `sw-manifest.js` يظل generated من الملفات الفعلية.
- الاستراتيجيات تصبح route-based بدل `if/else` scattered.
- الكاشات تفصل بين:
  - `documents`
  - `static`
  - `data`
  - `runtime`
- update broadcasting متاح من الـ Service Worker للواجهة.

## ما الذي تغير
- `sw.js` أصبح يعتمد على:
  - `normalizeManifest()`
  - `ROUTE_POLICIES`
  - strategy factories:
    - `createNetworkFirstStrategy()`
    - `createStaleWhileRevalidateStrategy()`
    - `createCacheFirstStrategy()`
- تم إضافة plugin-like hooks inspired by Workbox:
  - `cacheWillUpdate`
  - `cacheDidUpdate`
- تم إضافة broadcast update messages إلى clients:
  - `SW_ACTIVATED`
  - `CACHE_UPDATED`
- `js/pwa.js` أصبح يلتقط رسائل الـ Service Worker لأغراض logging والاستعداد لتحسينات UX لاحقًا.

## سياسة المسارات الحالية
- Documents / navigations → `network-first`
- `data/quran/surahs/*` → `cache-first + background revalidate`
- `data/azkar/categories/*` → `cache-first + background revalidate`
- بقية `/data/*` → `stale-while-revalidate`
- static assets → `stale-while-revalidate`
- runtime fallbacks → `cache-first`

## manifest generation
`tools/build-sw-manifest.mjs` أصبح يولد:
- `documentUrls`
- `shellUrls`
- `essentialDataUrls`
- `warmDataUrls`
- `precache` object
- `routing.documentFallback`

### warm data
تم تعريف warm candidates بسيطة الآن:
- `./data/azkar/categories/azkar-morning.js`
- `./data/quran/surahs/001.json`

وهذه قاعدة قابلة للتوسعة لاحقًا حسب احتياج الأقسام الجديدة.

## لماذا هذا أفضل
- أقرب إلى Workbox mental model بدون تعقيد خارجي.
- أسهل في التوسع عند إضافة sections وdata sources جديدة.
- أسهل في مراجعة policy لكل route.
- أسهل في ضبط cache behavior لكل نوع محتوى.

## ما لم يتغير بعد
- لم يتم بعد تقليل حجم precache الأساسية (`Phase 17-B`).
- لم يتم بعد تحسين update UX بصريًا (`Phase 17-C`).

## أوامر التحقق
```bash
node tools/build-sw-manifest.mjs
node tools/verify-architecture.mjs
```
