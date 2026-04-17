# Pass 20 — Global Actions Dead Fix

## Executive Summary
تم تحديد السبب الجذري الحقيقي للمشكلة التي جعلت التطبيق يظهر لكن كل الأزرار لا تعمل.

المشكلة **لم تكن** في click delegation أو navigation maps.
كانت في **SyntaxError داخل module graph الأساسي**، مما كان يوقف تحميل JavaScript قبل bootstrap.

## Root Cause
ملفان كانا يحتويان على string literals مكسورة بسبب newline raw داخل single-quoted string:

1. `js/features/quran/quran-study-controller.js`
2. `js/features/names/names-actions.js`

هذا كان يؤدي إلى توقف تحميل `js/main.js` مبكرًا، لذلك:
- الصفحة الرئيسية تظهر كـ HTML/CSS
- لكن لا يتم ربط أي listeners
- ولا يعمل أي زر أو فتح قسم

## What was fixed
### 1) Fix broken string literal in Quran study controller
تم تصحيح:
- `parts.join('\n\n')`

بدل string literal المكسورة عبر newline raw.

### 2) Fix broken string literal in Names actions
تم تصحيح:
- `parts.join('\n\n')`

بدل string literal المكسورة عبر newline raw.

### 3) Add module-graph verification
تمت إضافة:
- `tools/verify-browser-module-graph.mjs`

هذا verifier يثبت stubs خفيفة للبيئة ثم يقوم بتحميل:
- `js/app/bootstrap/start-app.js`

والهدف:
- كشف parse/module-load failures التي قد لا تظهر بوضوح عبر checks التقليدية
- منع رجوع نفس النوع من الأعطال التي تجعل الواجهة تظهر لكن التطبيق لا يعمل

### 4) Integrate verification into architecture gate
تم تحديث:
- `tools/verify-architecture.mjs`

بحيث يفشل أيضًا لو `verify-browser-module-graph.mjs` فشل.

## Verification
نجح بعد الإصلاح:
- `node tools/build-static-shell.mjs`
- `node tools/verify-browser-module-graph.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`
- `node day_cycle_validation_gate.mjs`

## Engineering Verdict
هذا الإصلاح يعالج فعليًا وصف المستخدم:
> التطبيق يفتح لكن لا زر يعمل ولا قسم يفتح

السبب كان fatal module parse failure، وليس event wiring logic.
