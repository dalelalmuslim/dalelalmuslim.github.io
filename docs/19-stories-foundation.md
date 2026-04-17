# Stories Foundation

تمت إضافة الطبقة الأساسية لقسم القصص بحيث لا يعود مجرد catalog بسيط.

## ما أضيف
- `data/stories/manifest.js` لتعريف metadata للتصنيفات.
- `stories-repository` لبناء catalog موحدة وربطها بـ `stories-data.js`.
- `stories-session-store` لحفظ القصة والتصنيف النشطين.
- `stories-preferences-store` لتفضيلات القراءة مثل `focus mode` و`large text` والمفضلة.
- `stories-history-store` لحفظ آخر قصة، السجل الأخير، والعلامات.
- `stories-selectors` لبناء view models للقسم.
- `stories-search-index` كأساس للبحث المحلي.

## كيف تضيف قصة جديدة
1. افتح `data/stories/stories-data.js`.
2. أضف story جديدة داخل التصنيف المطلوب مع `id`, `title`, `story`, `lesson`, `source`.

## كيف تضيف تصنيف جديد
1. أضف category جديدة داخل `data/stories/stories-data.js`.
2. أضف metadata لها داخل `data/stories/manifest.js`.
3. استخدم `slug` ثابتة ولا تغيّرها بعد اعتمادها.

## الهدف
تهيئة القسم لإضافة features لاحقًا مثل:
- continue reading
- bookmark
- favorites
- search
- story of the day
- reader view مستقل
