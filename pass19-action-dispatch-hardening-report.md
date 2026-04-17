# Pass 19 — Action Dispatch Hardening

## Executive Summary
هذه الجولة تعالج regression محتملة من نوع:
- الصفحة الرئيسية تعمل
- القسم يفتح
- لكن أزرار داخل بعض الأقسام لا تستجيب

تم تنفيذ hardening دفاعي منخفض المخاطر على مسار action dispatch للأقسام الأكثر عرضة لذلك:
- `duas`
- `stories`

## What changed

### 1) Global click dispatch now covers `duas` and `stories`
تم توسيع `js/app/events/click-action-map.js` ليشمل:
- `data-duas-action`
- `data-stories-action`

بدل الاعتماد فقط على root-local click delegation داخل controllers.

### 2) Central action handlers for `duas`
تم إضافة:
- `dispatchDuasAction(action, payload)`
- `handleDuasActionTarget(actionTarget)`

وتم ربطها بقدرات feature حتى يتمكن global dispatcher من استدعائها.

### 3) Central action handlers for `stories`
تم إضافة:
- `dispatchStoriesAction(action, payload)`
- `handleStoriesActionTarget(actionTarget)`

وتم ربطها بقدرات feature.

### 4) `stories` lifecycle fix
كان `storiesFeature` يعتمد على `init()` فقط لتنفيذ render، بدون `enter()` / `refresh()` مثل بقية الأقسام.
تم إصلاح ذلك بإضافة:
- `enter()`
- `refresh()`

وبهذا يصبح سلوكها متسقًا مع بقية sections.

### 5) Local click duplication removed implicitly
تم إبقاء input delegation محليًا فقط في `duas/stories` للبحث الحي،
بينما click actions أصبحت تُخدم من global dispatcher.

## Why this fix is correct
هذا ليس refactor شكليًا.

المشكلة المحتملة هنا هي fragility في event routing:
- بعض الأقسام تستخدم global delegation
- وبعضها كان يستخدم local delegation فقط
- ومع أي lifecycle/render drift يصبح عندك قسم يفتح لكن أزراره لا تعمل

الحل الصحيح هنا هو:
- توحيد click routing
- جعل capabilities قادرة على تنفيذ action targets مباشرة
- جعل `stories` تملك lifecycle كاملة

## Verification
نجح بعد التنفيذ:
- `node tools/build-static-shell.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`
- `node day_cycle_validation_gate.mjs`

## Important note
لم أستطع تنفيذ browser-level runtime click smoke داخل بيئة الحاوية لأن Chromium هنا محجوب بسياسة مؤسسية (`127.0.0.1 is blocked`).
لذلك هذا pass هو:
- **code-level fix قوي ومباشر**
- **validated structurally/build-wise**
- لكنه ما زال يحتاج تحققك السريع على جهازك للـ exact runtime symptom
