# Phase 7 — Runtime Hardening

## Summary
هذه المرحلة أغلقت أخطر نقطة drift متبقية في الـ PWA/runtime:
قائمة `sw.js` اليدوية الطويلة.

## What changed
- تم إضافة `tools/build-sw-manifest.mjs`
- تم توليد `sw-manifest.js` من ملفات runtime الفعلية بدل القائمة اليدوية داخل `sw.js`
- `sw.js` أصبح يقرأ من generated manifest مع fallback minimal manifest
- `js/pwa.js` أصبح يسجل الـ Service Worker باستخدام `updateViaCache: 'none'`
- `js/pwa.js` يطلب update check عند:
  - التسجيل
  - رجوع الاتصال
  - رجوع التبويب للواجهة
- `tools/verify-architecture.mjs` أصبح:
  - يحسب `export ... from` ضمن dependency graph
  - يتحقق من وجود `sw-manifest.js`
  - يفشل إذا كان الـ manifest stale
- تم تحديث التوثيق في:
  - `ARCHITECTURE.md`
  - `MAINTENANCE_GUIDE.md`
  - `RELEASE_READINESS.md`
  - `docs/08-runtime-hardening.md`

## Verification result
- syntax errors = 0
- missing local imports = 0
- legacy runtime imports = 0
- state layer imports = 0
- cross-feature imports = 0
- sw manifest exists = true
- stale generated sw manifest = false
- missing sw urls = 0
- inline handlers = 0
- inline styles = 1
- zero inbound js files = 0

## Notes
- `data/quran/surahs/*.json` بقيت intentional خارج precache لتجنب تضخيم الكاش الأولي.
- `sw-manifest.js` يجب إعادة توليده قبل أي إصدار بعد تغييرات runtime.
