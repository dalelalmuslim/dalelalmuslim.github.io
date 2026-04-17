# Pass 29 — User Azkar Simplification Integration

## Summary
تم دمج ملفات المستخدم المعدلة الخاصة بقسم الأذكار داخل نسخة التطبيق الكاملة.

## User changes integrated
- تبسيط `primary-content.html` لقسم الأذكار
- تبسيط `templates.html` لبطاقات التصنيفات وبطاقات الذكر
- تبسيط `css/features/azkar.css`
- تبسيط renderers/controller الخاصة بالأذكار

## Compatibility fixes applied during integration
أثناء الدمج ظهرت 3 مشاكل بنيوية تم إصلاحها للحفاظ على استقرار التطبيق الكامل:

1. `js/features/azkar/azkar-renderers.js`
   - تم تحديث re-exports لتتوافق مع renderer API الجديدة بعد حذف exports القديمة من `azkar-header-renderers.js`.

2. `js/features/azkar/azkar-grid-renderers.js`
   - تم إزالة `innerHTML` الخام واستبداله بإنشاء عناصر DOM آمن حتى يمر `verify-dom-safety.mjs`.

3. `js/features/azkar/azkar-controller.js`
   - تم استبدال `style.width` المباشر باستخدام `setProgressPercent()` حتى يمر `verify-dom-safety.mjs`.

## Final changed files in full app
- `src/index-fragments/content/primary-content.html`
- `src/index-fragments/templates.html`
- `css/features/azkar.css`
- `js/features/azkar/azkar-controller.js`
- `js/features/azkar/azkar-dom.js`
- `js/features/azkar/azkar-grid-renderers.js`
- `js/features/azkar/azkar-header-renderers.js`
- `js/features/azkar/azkar-session-renderers.js`
- `js/features/azkar/azkar-renderers.js`
- regenerated `index.html`
- regenerated `sw-manifest.js`

## Verification
نجح بعد الدمج:
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

## Engineering verdict
الاتجاه البصري أصبح أبسط بوضوح، وأقرب إلى habit-first flow.

لكن التبسيط الحالي trade-off واضح:
- أصبح أسرع وأهدأ
- لكنه حذف بعض affordances والإشارات السياقية التي كانت تساعد المستخدم المتقدم

كقرار منتج عام يومي: هذا الاتجاه مقبول وجيد.
