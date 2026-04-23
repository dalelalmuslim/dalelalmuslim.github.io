# Cloudflare Pages Functions — Phase 2 / Public Content API

## الهدف
بدء Phase 2 فعليًا من نفس baseline الحالي عبر بناء **Public Content API** فوق البنية الموجودة، بدون rewrite وبدون كسر runtime المحلي.

## ما تم تنفيذه في هذه الدفعة
- توحيد contract الخاص بإصدارات المحتوى العامة داخل shared contract واحد.
- إزالة duplication بين runtime و `functions/` فيما يخص versions map و section registry.
- ترقية `GET /api/public/versions` ليخرج عبر envelope موحد مع metadata واضحة.
- إضافة public endpoints مستقلة للأقسام التالية:
  - `/api/public/content/app-config`
  - `/api/public/content/azkar`
  - `/api/public/content/duas`
  - `/api/public/content/stories`
  - `/api/public/content/daily-content`
- إضافة request handling أوضح داخل `functions/_shared/http.js`:
  - `GET`
  - `HEAD`
  - `OPTIONS`
  - `405` موحد
  - headers أمنية أساسية

## لماذا هذا هو أول batch الصحيح؟
لأن scaffold السابق كان يثبت وجود Pages Functions فقط، لكنه لم يكن يقدّم API قابلة للاستهلاك ولا يضمن عدم drift بين نسخة الـ runtime ونسخة الـ functions.

## قرار هندسي مهم
تحميل `daily_content` داخل Pages Functions لا يستخدم `fetch('./relative-path')` لأن هذا الأسلوب غير موثوق داخل runtime الخادم. بدلًا من ذلك، يتم استخدام absolute asset URL مشتق من `request.url` للوصول إلى ملف `home-ayahs.json`.

## ما الذي لم نفعله بعد عمدًا؟
- D1 bindings
- admin APIs
- auth/authz backend
- CRUD
- delta sync / ETag / conditional requests
- ربط frontend باستهلاك الـ API الجديدة فعليًا

## قيد نشر مهم
مسار النشر اليدوي الحالي (`dalil-almuslim-dist.zip`) ما زال static-only ولا يضم `functions/`. لذلك هذه الدفعة تبدأ backend boundary داخل الكود، لكن تفعيلها على live manual target يحتاج batch نشر مخصص لاحقًا أو تفعيل target نشر يدعم Functions فعليًا.
