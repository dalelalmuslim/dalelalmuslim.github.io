# Pass 36 — Duas Layout Declutter

## Summary
تمت جولة ثانية مركزة على قسم الأدعية لمعالجة الزحام البصري وسوء ترتيب المعلومات.

## Files Changed
- `js/features/duas/duas-renderers.js`
- `css/features/duas.css`
- regenerated `sw-manifest.js`

## What Changed
- إعادة ترتيب الـ hero ليكون أبسط وأهدأ.
- بطاقة `دعاء اليوم` أصبحت أوضح مع CTA ثابت وواضح.
- بطاقة `تابع من حيث توقفت` أصبحت أكثر مباشرة وأقل تكدسًا.
- بطاقة الملخص أصبحت أخف وبدون تكرار غير ضروري للمعلومات.
- شريط البحث والفلاتر صار أوضح وترتيبه أفضل.
- بطاقات التصنيفات أعيد تصميمها لتقليل:
  - كثرة الـ pills
  - تكرار الـ metadata
  - الضوضاء في footer
- جلسة القراءة أصبحت أكثر توازنًا:
  - header أوضح
  - meta وcontrols منفصلان بصريًا
  - footer في بطاقة الدعاء منظم

## Verification
نجحت الأوامر التالية:
- `node tools/build-app-css.mjs`
- `node tools/build-sw-manifest.mjs`
- `node tools/verify-browser-module-graph.mjs`
- `node tools/verify-dom-safety.mjs`
- `node tools/verify-architecture.mjs`

## Notes
هذه الجولة مركزة على layout hierarchy + declutter، ولم تُدخل منطقًا جديدًا قد يغير سلوك القسم.
