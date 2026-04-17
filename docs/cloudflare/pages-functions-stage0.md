# Cloudflare Pages Functions — Stage 0 Scaffold

## الهدف
تجهيز الحد الأدنى من هيكل Cloudflare داخل نفس المشروع بدون كسر runtime الحالي أو إدخال backend live قبل أوانه.

## الموجود الآن
- `wrangler.toml`
- `functions/api/health.js`
- `functions/api/public/versions.js`
- `functions/_shared/http.js`
- `functions/_shared/public-versions.js`

## لماذا هذا scaffold الآن؟
لأن المرحلة التالية ستحتاج:
- public versions endpoint
- envelope موحد للاستجابات
- نقطة فحص بسيطة للتأكد أن Pages Functions مفعلة

## ما الذي لم نفعله عمدًا بعد؟
- D1 binding
- محتوى حي من قاعدة البيانات
- Admin APIs
- auth/authz backend
- content CRUD

## ملاحظة هندسية
هذه الملفات لا تغيّر سلوك التطبيق الحالي. هي فقط تثبّت بنية Cloudflare القادمة داخل نفس repository بدل فتح مشروع موازٍ.
