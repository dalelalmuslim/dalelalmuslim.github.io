# Manual Cloudflare Direct Upload

هذا المستند يثبّت مسار النشر الحالي للمشروع بعد نجاح أول نشر حي عبر **Direct Upload**.

## الوضع الحالي
- **GitHub source of truth**: `dalelalmuslim/dalelalmuslim.github.io`
- **Live manual deploy project**: `dalil-almuslim-web`
- **نوع النشر الحالي**: رفع zip يدوي إلى Cloudflare Pages / Workers & Pages
- **سبب الاعتماد المؤقت لهذا المسار**: فشل Git-integrated build داخل Cloudflare أثناء `npm clean-install` بسبب network timeout خارجي، وليس بسبب خطأ في التطبيق نفسه.

## متى نستخدم هذا المسار؟
نستخدمه عندما نريد:
- نشر نسخة حية بسرعة
- تجاوز build timeout داخل Cloudflare
- الحفاظ على GitHub كمصدر حقيقة للكود

## الأوامر الرسمية
من جذر المشروع:

```bash
npm run release:manual-cloudflare
```

هذا الأمر ينفّذ:
1. فحوصات المشروع (`npm run check`)
2. إعادة توليد shell النهائي
3. إنشاء مجلد `dist/`
4. التحقق من محتويات `dist/`
5. إنشاء الملف `dalil-almuslim-dist.zip`

## ما الذي يدخل إلى `dist/`
### ملفات جذرية
- `index.html`
- `about.html`
- `contact.html`
- `privacy.html`
- `terms.html`
- `manifest.json`
- `robots.txt`
- `sitemap.xml`
- `sw.js`
- `sw-manifest.js`
- `sw-routes.js`
- `sw-strategies.js`

### مجلدات عامة
- `assets/`
- `css/`
- `data/`
- `js/`

## ما الذي لا يجب أن يدخل إلى النشر؟
لا نرفع إلى Cloudflare Direct Upload هذه العناصر:
- `docs/`
- `functions/`
- `node_modules/`
- `src/`
- `tools/`
- `.github/`
- أي ملفات تشغيل محلية أو تقارير تنفيذية

## خطوات الرفع
1. افتح **Workers & Pages** في Cloudflare
2. اختر مشروع النشر اليدوي الحالي: `dalil-almuslim-web`
3. ارفع الملف `dalil-almuslim-dist.zip`
4. انتظر انتهاء النشر
5. افحص الصفحة الرئيسية والصفحات القانونية والتنقل الرئيسي

## ملاحظة مهمة
هذا المسار **مؤقت لكنه رسمي** في الوقت الحالي. الهدف لاحقًا هو العودة إلى Git-integrated deploy بعد تنظيف pipeline أو تقليل الاعتمادات التي تحتاج تنزيل داخل Cloudflare.
