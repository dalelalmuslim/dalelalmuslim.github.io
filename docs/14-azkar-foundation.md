# Azkar Foundation Upgrade

## الهدف
هذه المرحلة تقفل أساس قسم الأذكار قبل أي redesign بصري كبير.

## ما الذي تغيّر
- manifest صارت تحتوي metadata أوضح لكل تصنيف
- progress صارت تعتمد على `slug` بدل عنوان التصنيف
- migration تلقائية من المفاتيح القديمة المعتمدة على `title`
- stores جديدة لقسم الأذكار:
  - `azkar-session-store.js`
  - `azkar-preferences-store.js`
  - `azkar-history-store.js`
  - `azkar-selectors.js`
- resume card أولية في أعلى القسم
- category cards تعرض progress ووقتًا تقديريًا

## كيف تضيف ذكرًا داخل تصنيف موجود
1. افتح الملف المطلوب داخل `data/azkar/categories/`
2. أضف item جديدة داخل `items`
3. حدث `itemCount`
4. أضف `id` جديدة داخل `itemIds`
5. احرص أن:
   - `id` فريدة
   - `legacyId` غير مكرر
   - `categorySlug` يساوي slug التصنيف
   - `categoryTitle` يساوي title التصنيف

## كيف تضيف تصنيفًا جديدًا
1. أنشئ ملفًا جديدًا داخل `data/azkar/categories/`
2. صدّر `AZKAR_CATEGORY`
3. أضف entry جديدة في `data/azkar/categories/manifest.js`
4. زود metadata المناسبة:
   - `slug`
   - `title`
   - `description`
   - `icon`
   - `period`
   - `sortOrder`
   - `estimatedMinutes`
   - `accentTone`
   - `reminderDefault`
   - `isDaily`

## قاعدة مهمة
بعد هذه المرحلة لا تعتمد على `title` كمفتاح بيانات. المفتاح الصحيح هو `slug`.
