# دليل المسلم

تطبيق ويب تقدمي (PWA) للمحتوى الإسلامي اليومي، مبني على هيكل modular واضح وقابل للانتقال التدريجي إلى Cloudflare + D1 بدون rewrite كامل.

## الاتجاه المعتمد
- **GitHub** للكود والمخططات والوثائق
- **Cloudflare Pages** لاستضافة الواجهة
- **Pages Functions / Workers** للـ API لاحقًا
- **D1** للمحتوى الحي لاحقًا
- **Local Cache** عند المستخدم للقراءة السريعة
- **Version مستقل لكل قسم** لتحديث القسم الذي تغيّر فقط
- **Typed JavaScript** الآن كمرحلة تمهيدية قبل TypeScript الكامل

## المرحلة الحالية
أول patch في المرحلة الأولى يركز على:
- تثبيت baseline الحالي بدل rewrite موازي
- إضافة content contracts/client محلي
- إضافة section cache/version store
- عزل auth خلف facade عامة
- بدء branding وstorage migration إلى **دليل المسلم**

## متى نعمل GitHub وCloudflare؟
- **GitHub**: مباشرة بعد اجتياز `npm run ready:local`.
- **Cloudflare Pages**: بعد أول push ناجح إلى GitHub، وليس قبل ذلك.
- الإعداد العملي الكامل موجود في: `docs/setup/repo-and-deploy-sequence.md`

## وضع النشر الحالي
- **Source of truth**: GitHub
- **النسخة الحية الحالية**: Cloudflare Direct Upload project `dalil-almuslim-web`
- **أمر تجهيز artifact الرسمي**: `npm run release:manual-cloudflare`
- **الوثائق المرتبطة**:
  - `docs/deploy/manual-cloudflare-direct-upload.md`
  - `docs/deploy/deploy-targets.md`

## طريقة التشغيل
1. ثبّت الاعتمادات: `npm install`
2. افحص shell المولّد: `npm run build:shell:check`
3. افحص المعمارية: `npm run verify:architecture`
4. افحص typed JS للطبقة التأسيسية: `npm run typecheck`

## المراجع الداخلية
- `docs/architecture.md`
- `docs/release-readiness.md`
- `docs/maintenance-guide.md`
- `docs/migration/stage-1-foundation.md`
