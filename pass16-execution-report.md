# Pass 16 Execution Report — Third-Party / CSP Hardening

## Scope
هذه الجولة نفذت أولوية **P2** بشكل منخفض المخاطر وعالي القيمة:
1. تقليل external origins الفعلية
2. شدّ Content-Security-Policy
3. منع رجوع external-boundary drift عبر verifier

## What was implemented

### 1) Removed unused jsDelivr dependency
تم حذف:
- `canvas-confetti` script من `src/index-fragments/head.html`
- origin `https://cdn.jsdelivr.net` من CSP الخاصة بالتطبيق

السبب:
- الـ script كانت محمّلة دائمًا في shell
- لا يوجد أي usage فعلي لـ `confetti` داخل الكود
- وجودها كان attack surface بلا قيمة تشغيلية

### 2) Tightened app CSP
تم تعديل CSP الخاصة بالتطبيق الرئيسي (`src/index-fragments/head.html` → generated `index.html`) كالتالي:
- إزالة `style-src 'unsafe-inline'`
- إزالة `https://cdn.jsdelivr.net` من `script-src`
- إزالة `https://*.googleapis.com` wildcard من `connect-src`
- الإبقاء فقط على origins المطلوبة فعليًا حاليًا:
  - `https://www.gstatic.com`
  - `https://www.googleapis.com`
  - `https://securetoken.googleapis.com`
  - `https://identitytoolkit.googleapis.com`
  - `https://firebaseinstallations.googleapis.com`
  - `https://fonts.googleapis.com`
  - `https://fonts.gstatic.com`
  - `https://cdnjs.cloudflare.com`

### 3) Tightened static-page CSPs
تم شدّ CSP في الصفحات التالية لتصبح self-only فعليًا:
- `about.html`
- `privacy.html`
- `terms.html`
- `contact.html`

التغييرات الأساسية:
- إزالة `unsafe-inline`
- إزالة السماح غير الضروري لـ Google Fonts / cdnjs / jsDelivr
- جعل `img-src`, `style-src`, `font-src`, `script-src` محصورة محليًا

### 4) Removed Font Awesome CDN from contact page
تم حذف الاعتماد الخارجي من:
- `contact.html`

بدلاً منه:
- تم استبدال أيقونات Font Awesome برموز نصية/Unicode بسيطة
- تم تحديث `css/pages/contact.css` لتدعم الرموز الجديدة (`contact-btn__icon`, `inline-symbol`, `faq-question__symbol`, `contact-link-symbol`)

النتيجة:
- `contact.html` لم تعد تحتاج أي CSS/Font من طرف ثالث
- CSP الخاصة بها أصبحت self-only بالكامل

### 5) Added external-boundary verifier
تمت إضافة:
- `tools/verify-external-boundaries.mjs`

وتم ربطه داخل:
- `tools/verify-architecture.mjs`

التحقق الجديد يفشل إذا عاد أي من التالي:
- `jsDelivr` إلى app shell
- `unsafe-inline` إلى CSP في الصفحات المستهدفة
- wildcard `*.googleapis.com` في app shell
- Google Fonts / cdnjs / Font Awesome إلى الصفحات الثابتة

## Files changed
- `src/index-fragments/head.html`
- `index.html` (generated)
- `about.html`
- `privacy.html`
- `terms.html`
- `contact.html`
- `css/pages/contact.css`
- `tools/verify-external-boundaries.mjs`
- `tools/verify-architecture.mjs`

## Verification
نجحت بعد التنفيذ:
- `node tools/build-static-shell.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`
- `node day_cycle_validation_gate.mjs`

والنتيجة المهمة:
- `inlineStylesCount: 0`
- `inlineHandlersCount: 0`
- `external boundary violations: 0`
- `zeroInboundJsFiles: 0`
- لا stale generated files

## Engineering verdict
Pass 16 نجحت.

الذي تحقق فعليًا:
- app shell لم تعد تسمح `unsafe-inline` في CSS
- تم حذف origin خارجية غير مستخدمة بالكامل (`jsDelivr`)
- الصفحات الثابتة أصبحت tighter بشكل واضح
- `contact.html` خرجت من dependency خارجية كاملة
- أصبح لدينا verifier تمنع ارتداد external-origin debt

## Remaining intentional debt
لا يزال التطبيق الرئيسي يعتمد على:
- Google Fonts
- Font Awesome CDN
- Firebase SDK from `www.gstatic.com`

وهذا دين مقصود حاليًا لأن استبداله يتطلب:
- إما self-host للأصول
- أو migration أوسع لنظام الأيقونات/الخطوط

هذا ليس blocker الآن، لكنه المرحلة التالية المنطقية إذا أردنا تشديدًا أعلى.
