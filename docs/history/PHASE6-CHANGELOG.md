# Phase 6 — Domain State Ownership

## ما الذي تغيّر فعليًا
- ألغيت الطبقة الانتقالية `js/state/*` بالكامل.
- نقلت ownership للحالة إلى domains/app layer المناسبة:
  - `js/domains/tasks/tasks-store.js`
  - `js/domains/settings/settings-store.js`
  - `js/domains/engagement/engagement-store.js`
  - `js/domains/quran/quran-bookmark-store.js`
  - `js/domains/home/home-feed-store.js`
  - `js/domains/masbaha/masbaha-progress-store.js`
  - `js/domains/azkar/azkar-progress-store.js`
  - `js/app/ui/ui-state.js`
- أضفت helper موحد للقراءة/الكتابة على التخزين:
  - `js/services/storage/storage-access.js`
- حدثت imports في app/features/services/domains حتى لا يعتمد أي جزء من runtime على `js/state/*`.
- شددت write paths في `domains/tasks/tasks-actions.js` لتعمل عبر store واضحة بدل mutation متداخل.
- حدثت `sw.js` ليعكس graph الجديد ورفعت cache version إلى `azkar-v26-phase6`.
- حدثت المستندات المرجعية:
  - `README.md`
  - `ARCHITECTURE.md`
  - `MAINTENANCE_GUIDE.md`
  - `RELEASE_READINESS.md`
  - `docs/07-domain-state-ownership.md`
- حدثت verifier ليمنع رجوع:
  - imports من `js/state/*`
  - وجود ملفات تحت `js/state/*`

## النتيجة البنيوية
- state imports = 0
- state files = 0
- direct `storage.state` usage outside storage service = 0
- syntax errors = 0
- missing local imports = 0
- legacy runtime imports = 0
- cross-feature imports = 0
- missing SW URLs = 0
- inline handlers = 0
- inline styles = 1

## ملاحظات
- الـ inline style المتبقي intentional لأنه runtime progress width.
- هذه المرحلة لا تغيّر UX أو route structure؛ هي إغلاق ownership فقط وتقليل مخاطر التعديل المستقبلي.
