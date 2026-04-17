# Phase 7 — Runtime Hardening

## الهدف
إزالة أخطر مصدر drift في الـ PWA الحالي: قائمة precache اليدوية داخل `sw.js`.

## ما الذي تغير
- تم إضافة `tools/build-sw-manifest.mjs`
- تم توليد `sw-manifest.js` من ملفات runtime الفعلية
- `sw.js` لم يعد owner لقوائم shell/data URLs يدويًا
- `js/pwa.js` يستخدم `updateViaCache: 'none'`
- `js/pwa.js` يطلب update check عند التسجيل، وعند العودة للواجهة، وعند رجوع الاتصال
- `tools/verify-architecture.mjs` أصبح يتحقق من:
  - وجود `sw-manifest.js`
  - عدم stale manifest
  - re-export dependencies عبر `export ... from`

## لماذا هذا مهم
- يقلل production drift بين الكود وprecache
- يقلل فرصة نسيان ملف جديد بعد إضافة section أو CSS جديد
- يجعل تحديثات الـ PWA أكثر موثوقية
- يحسّن جودة verifier لأن re-export edges أصبحت محسوبة

## أمر البناء المطلوب قبل الإصدار
```bash
node tools/build-sw-manifest.mjs
node tools/verify-architecture.mjs
```

## ملاحظة
الـ manifest المولد لا يضيف `data/quran/surahs/*.json` إلى precache عمدًا، لأن هذه الملفات كبيرة ويجب أن تبقى runtime-cached عند الطلب.
