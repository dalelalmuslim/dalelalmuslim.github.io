# Phase 6 — Domain State Ownership

الهدف من هذه المرحلة هو إنهاء الطبقة الانتقالية `js/state/*` ونقل ownership للحالة إلى الـ domains نفسها.

## ما الذي تغيّر؟
- `tasksStore` أصبح داخل `js/domains/tasks/tasks-store.js`
- `settingsStore` أصبح داخل `js/domains/settings/settings-store.js`
- `engagementStore` أصبح داخل `js/domains/engagement/engagement-store.js`
- `quranBookmarkStore` أصبح داخل `js/domains/quran/quran-bookmark-store.js`
- `homeFeedStore` أصبح داخل `js/domains/home/home-feed-store.js`
- `masbahaProgressStore` أصبح داخل `js/domains/masbaha/masbaha-progress-store.js`
- `azkarProgressStore` أصبح داخل `js/domains/azkar/azkar-progress-store.js`
- app-level UI state انتقل إلى `js/app/ui/ui-state.js`

## لماذا هذا أفضل؟
- كل domain أصبح يملك state + read/write API الخاصة به
- لم يعد هناك hidden layer اسمها `state` تعتمد عليها features بشكل أفقي
- write paths أصبحت تمر عبر stores/actions واضحة بدل mutation مباشر متكرر
- `storage.state` لم يعد surface عامة لمعظم التطبيق

## قاعدة الإضافة الجديدة
أي state جديدة يجب أن تذهب إلى واحد من التالي فقط:
1. `js/domains/<domain>/*` إذا كانت persistent أو domain-owned
2. `js/app/ui/ui-state.js` إذا كانت app-level ephemeral UI state

## الممنوع
- إعادة إنشاء `js/state/*`
- استيراد `storage.state` مباشرة داخل feature/controller
- كتابة state من أكثر من مكان بدون owner واضح
