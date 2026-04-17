# Phase 1 Patch

## الهدف
إقفال boundaries الحرجة بدون rewrite كامل ولا كسر الـ UI الحالي.

## ما تم فعليًا

### 1) فك coupling المباشر بين الأقسام
تم استبدال calls المباشرة بين الأقسام بـ event bridge موحد:
- `js/app/events/app-event-bus.js`
- `js/domains/stats/stats-events.js`

الأقسام التي أصبحت تعلن event بدل استدعاء قسم آخر مباشرة:
- `tasks`
- `wird`
- `settings`
- `day-cycle`

الأقسام التي أصبحت تستقبل التحديث عبر subscription:
- `home`
- `tasks`

### 2) نقل home mini stats وdaily content خارج content hub
تم إنشاء:
- `js/features/home/home-feed-controller.js`
- `js/features/home/home-dom.js`
- `js/domains/home/home-feed-data.js`
- `js/domains/home/home-feed-service.js`

وبالتالي `home` لم يعد يعتمد على `features/content`.

### 3) نقل منطق الإحصائيات إلى domain واضح
تم إنشاء:
- `js/domains/stats/stats-selectors.js`

والملف القديم:
- `js/tasks/tasks-stats.js`
أصبح compatibility wrapper فقط.

### 4) فصل katalog الأقسام عن content hub
تم نقل منطق:
- `duas`
- `names`
- `stories`

إلى modules أوضح:
- `js/shared/content/catalog-data-loader.js`
- `js/shared/content/catalog-dom.js`
- `js/shared/content/catalog-renderers.js`
- `js/features/duas/duas-controller.js`
- `js/features/names/names-controller.js`
- `js/features/stories/stories-controller.js`

### 5) إزالة inline handler
تم حذف `onclick="window.history.back()"` من template واستبداله بـ data-action موحد.

### 6) تحديث SW
- إزالة entries الخاصة بـ `features/content`
- إضافة الملفات الجديدة
- تحديث `CACHE_VERSION` إلى `azkar-v26-phase1`

### 7) إضافة verifier أوضح
تم إنشاء:
- `tools/verify-architecture.mjs`

ويتحقق من:
- syntax
- missing imports
- legacy imports
- cross-feature imports
- inline handlers
- missing SW URLs

## ما لم يتم في هذه المرحلة
- لم يتم بعد فصل `wird` إلى `azkar + masbaha`
- لم يتم بعد فصل `tasks` إلى `tasks + stats`
- لم يتم بعد نقل الـ CSS الفعلي إلى `css/features/*`
- لم يتم بعد إزالة الـ inline styles الكثيرة من `index.html` (ما زال العدد 88)

## نتيجة المرحلة
- no cross-feature imports
- no inline handlers
- verifier passes
- no missing SW URLs

