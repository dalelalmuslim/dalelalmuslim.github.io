# Architecture Freeze

هذا المستند هو المرجع الرسمي للمعمارية الحالية بعد إعادة الهيكلة. الهدف ليس وصفًا عامًا فقط، بل **تثبيت boundaries** ومنع العودة إلى god files وspaghetti imports.

## 1) Entry and Composition Root

```text
index.html
  -> js/main.js
    -> js/app/bootstrap/start-app.js
      -> js/app/core/app-controller.js
      -> js/router/*
      -> js/features/*
      -> js/domains/*
      -> js/app/ui/ui-state.js
      -> js/services/*
```

### قواعد ملزمة
- `index.html` يجب أن يحمّل **entry module واحد فقط**: `js/main.js`
- `js/main.js` هو **composition root entry** وليس مكان business logic
- لا يُسمح بإضافة `<script type="module">` داخل HTML لتشغيل features أو services مباشرة

## 2) Directory Ownership

### `js/app/*`
مسؤول عن:
- bootstrap
- app shell orchestration
- top-level app DOM wiring
- app lifecycle bindings
- shell-level UI managers

غير مسؤول عن:
- feature data loading
- feature-local rendering details
- storage implementation
- notification scheduling implementation

### `js/router/*`
مسؤول عن:
- route state
- section metadata registry
- section lifecycle runtime
- navigation orchestration

غير مسؤول عن:
- feature internals
- storage persistence
- DOM rendering الخاص بالميزات

### `js/features/*`
كل مجلد feature هو **owner** لسلوك القسم الخاص به.

الحد الأدنى المتوقع داخل أي feature جديد:
- `index.js` — public feature API
- `...-controller.js` أو ما يكافئه — composition/controller
- modules داخلية إضافية حسب الحاجة

### `js/domains/*`
مسؤول عن:
- state ownership داخل كل domain
- selectors / actions / repository boundaries
- typed/normalized access to persisted state

غير مسؤول عن:
- DOM
- router
- cross-feature rendering

### `js/app/ui/ui-state.js`
مسؤول عن app-level ephemeral UI state فقط:
- current section
- active modal
- active subview

### `js/services/*`
مسؤول عن:
- storage
- auth
- notifications
- engagement/rewards/achievements
- ads runtime
- platform adapters

الخدمات هي boundaries مع العالم الخارجي أو cross-feature domains.

## 3) Dependency Direction (Mandatory)

```text
index.html -> main -> app/bootstrap -> app/core
app/core -> router, domains, services, features
router -> features
features -> domains, services, shared app/ui helpers (عند الحاجة)
domains -> services/storage أو pure utilities فقط
services -> platform/browser APIs
```

### ممنوعات صريحة
- feature يستورد internals من feature آخر مباشرة
- domain store يستورد DOM أو router
- service يستورد feature UI implementation
- إعادة إنشاء root facade files مثل `js/tasks.js` أو `js/content.js`
- reintroducing window globals كـ integration surface

## 4) Feature Contract

كل feature يجب أن يوفّر public API عبر `js/features/<feature>/index.js` باستخدام contract موحّد منطقيًا:
- `id`
- `title`
- `booted`
- `init()`
- `enter()`
- `refresh()`
- `leave()`
- `dispose()`
- `capabilities`

### Capabilities
أي تكامل عابر بين الأقسام يجب أن يمر عبر `capabilities` المعلنة، وليس عبر استيراد ملفات داخلية من feature أخرى.

## 5) Data Source Rules

### Quran
- المصدر المعتمد: `data/quran/surahs/*.json`
- fallback المسموح: `data/quran/quran-legacy-data.js`
- أي استهلاك يجب أن يمر عبر:
  - `js/features/quran/quran-data-source.js`

### Azkar Categories
- المصدر المفضّل: `data/azkar/categories/*.js`
- fallback المسموح: `data/azkar/azkar-legacy-catalog.js`
- أي استهلاك يجب أن يمر عبر:
  - `js/domains/azkar/azkar-repository.js`

## 6) Ads Policy

- الإعلانات **معطلة مركزيًا الآن**
- config والمفاتيح محفوظة
- أي تشغيل لاحق يجب أن يمر عبر:
  - `js/services/ads/ads-policy.js`
  - `js/services/ads/*`

ممنوع تشغيل/إخفاء الإعلانات من داخل features بشكل مباشر.

## 7) Firebase Boundary

Firebase يستخدم لـ **Authentication only**.

ممنوع استخدام Firebase من أجل:
- Firestore sync
- cloud state persistence
- local storage replacement
- ad hoc state merge

المدخل الصحيح:
- `js/services/auth/*`

## 8) Service Worker / PWA Rules

- `sw.js` يجب أن يظل aligned مع graph الحالي
- لا تضف precache entries لملفات محذوفة أو deprecated يدويًا داخل `sw.js`
- المصدر المعتمد الآن هو `sw-manifest.js` المولّد عبر:
  - `node tools/build-sw-manifest.mjs`
- `sw-manifest.js` يجب أن يُعاد توليده بعد أي تغيير في:
  - `css/*`
  - `js/*`
  - `assets/icons/*`
  - `assets/*`
  - البيانات الأساسية داخل `data/*`
- data sources الكبيرة يجب أن تستخدم runtime strategy مناسبة، لا dump precache عشوائي
- تسجيل الـ Service Worker يجب أن يستخدم `updateViaCache: 'none'` لتقليل stale updates

## 9) When Adding a New Section

1. أنشئ feature folder جديد داخل `js/features/<name>/`
2. ابدأ بـ `index.js` كـ public API
3. عرّف capabilities بوضوح
4. أضف section registration عبر `js/features/index.js` و `js/features/feature-sections.js`
5. لا توصل feature الجديد مباشرة بـ `window`, `localStorage`, `Notification`, `navigator.share`
6. استخدم stores/services القائمة أو أضف boundaries جديدة عند الحاجة

## 10) Migration Status Freeze

تم إلغاء/إزالة legacy facades التالية نهائيًا:
- `js/content.js`
- `js/tasks.js`
- `js/quran.js`
- `js/masbaha.js`
- `js/storage.js`
- `js/notifications.js`
- `js/achievements.js`
- `js/rewards.js`
- `js/ads.js`
- `js/app.js`
- `js/firebase-core.js`
- `js/ui-state.js`

هذه الملفات **لا يجب إعادتها**.
