# Pass 17 Execution Report — Raw HTML Boundary Reduction

## Scope
هذه الجولة نفذت الأولوية التالية بعد baseline + CSP hardening:
1. تقليل raw HTML allowlist نفسها
2. تحويل renderers البسيطة من `innerHTML` إلى DOM construction آمن
3. إبقاء فقط المسارات التي ما زالت تعتمد على trusted app-generated templates

## What was implemented

### 1) Shared DOM helpers strengthened
تم توسيع `js/shared/dom/dom-helpers.js` بإضافات صغيرة ومباشرة:
- `createIconElement()`
- `createTextElement()`
- `clearElement()`

الهدف كان إزالة `innerHTML` من renderers البسيطة بدون إدخال framework أو over-engineering.

### 2) UI renderers migrated away from raw HTML writes
تم حذف raw HTML writes من الملفات التالية وتحويلها إلى DOM node creation / `replaceChildren()`:

- `js/services/auth/firebase-auth-renderers.js`
- `js/pwa-support/pwa-install-prompt.js`
- `js/app/actions/toast-actions.js`
- `js/features/tasks/tasks-view.js`
- `js/features/names/names-surface.js`
- `js/features/masbaha/masbaha-renderers.js`
- `js/features/azkar/azkar-grid-renderers.js`
- `js/features/azkar/azkar-header-renderers.js`
- `js/features/azkar/azkar-session-renderers.js`

### 3) DOM safety verifier tightened
تم تقليص `RAW_HTML_ALLOWLIST` في `tools/verify-dom-safety.mjs` لتبقى فقط المسارات المقصودة فعلاً:
- `js/features/duas/duas-controller.js`
- `js/features/stories/stories-controller.js`
- `js/shared/dom/dom-helpers.js`

### 4) Resulting boundary after pass 17
الوضع الآن أصبح أدق بكثير:
- renderers البسيطة لا تكتب HTML خام
- أي raw HTML usage خارج allowlist يفشل في التحقق
- allowlist الحالية أصبحت تمثل فقط:
  - stories shell/catalog/reader templates
  - duas shell/catalog/session templates
  - trusted template helper نفسه

## Why this is the correct move
هذا ليس refactor شكلي.

التحسين الحقيقي هنا هو أن boundary أصبحت **صريحة ومحدودة**:
- إمّا DOM construction مباشر
- أو trusted app-generated template paths محددة وواضحة

وبالتالي انخفض احتمال تسرب `innerHTML` إلى مسارات UI متفرقة مع الوقت.

## Verification
نجح بعد التنفيذ:
- `node tools/build-static-shell.mjs`
- `node tools/verify-dom-safety.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`
- `node day_cycle_validation_gate.mjs`

النتيجة المهمة:
- `inlineStyleAttributes: []`
- `styleMutations: []`
- `rawHtmlWritesOutsideAllowlist: []`
- raw HTML allowlist reduced to **3 files only**

## Remaining intentional debt
المتبقي الآن مقصود ومفهوم:
- `stories-controller.js`
- `duas-controller.js`
- `appendTrustedHTML()` template helper

هذه ليست ديون عشوائية؛ هي boundary واضحة حول trusted app-generated markup.

## Engineering verdict
Pass 17 نجحت.

الذي تحقق فعليًا:
- تقليل raw HTML surface بدرجة ملموسة
- tightening للـ verifier بدل الاكتفاء بالـ convention
- إبقاء architecture والـ validations مستقرة

الخطوة التالية الصحيحة:
- إما إبقاء الوضع الحالي كـ hardened baseline
- أو تنفيذ pass صغيرة لاحقة لتفكيك template-heavy paths (`stories` / `duas`) إذا كان هناك سبب وظيفي حقيقي
