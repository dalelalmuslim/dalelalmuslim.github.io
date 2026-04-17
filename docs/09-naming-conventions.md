# Naming Conventions

## الهدف
تثبيت naming موحد يقلل الالتباس بين `feature`, `domain`, `service`, `shared`, و`data`.

## القواعد
- `features/<section>/<section>-controller.js` للتنسيق الداخلي للقسم.
- `features/<section>/<section>-dom.js` للـ DOM selectors الخاصة بالقسم.
- `features/<section>/<section>-renderers.js` للـ render logic فقط.
- `domains/<domain>/<domain>-store.js` لملكية الحالة.
- `domains/<domain>/<domain>-actions.js` أو `<domain>-progress-actions.js` لعمليات الكتابة.
- `shared/content/*-loader.js` للـ lazy loading/cache، وليس `*store.js` إذا لم يكن الملف store حقيقيًا.
- `shared/contracts/*` لعقود الـ feature framework helpers، وليس داخل `features/*` نفسها.
- أسماء data files تكون kebab-case داخل folder خاص بكل domain.

## Data Layout
- `data/home/*` لأي بيانات تخص الـ home feed.
- `data/azkar/*` لبيانات الأذكار وfallback catalog وsplit categories.
- `data/duas/*` لبيانات الأدعية فقط.
- `data/names/*` لبيانات الأسماء فقط.
- `data/stories/*` لبيانات القصص فقط.
- `data/quran/*` لبيانات القرآن وfallback catalog وsplit surahs.

## DOM/CSS naming
- داخل قسم الأذكار نستخدم prefix واضح: `azkar-item-*`.
- داخل قسم المسبحة نستخدم prefixes واضحة: `masbaha-current-*` و `masbaha-custom-*`.
- لا نضيف classes جديدة بصيغة `zekr-*` أو `custom-zekr-*`.


## Root hygiene
- نبقي root نظيفًا قدر الإمكان: ملفات التشغيل فقط مثل `index.html`, `manifest.json`, `sw.js`, و `README.md`.
- ننقل وثائق التشغيل والصيانة إلى `docs/`.
- ننقل تقارير التحقق والـ changelogs التاريخية إلى `docs/history/`.
