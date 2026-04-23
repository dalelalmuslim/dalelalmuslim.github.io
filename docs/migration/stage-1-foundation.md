# Stage 1 — Foundation Alignment

## الهدف
تحويل المشروع الحالي إلى قاعدة متوافقة مع اتجاه **دليل المسلم** بدون rewrite موازي.

## ما نُفذ في أول Patch
- اعتماد Typed JavaScript تدريجيًا عبر `package.json` و `tsconfig.json`.
- إضافة content contracts و local content client.
- إضافة section cache و section version store.
- عزل auth وراء facade عامة.
- بدء إعادة تسمية الهوية إلى **دليل المسلم**.
- بدء migration آمن لمفتاح التخزين الرئيسي.

## ما نُفذ في هذه الدفعة
- تفعيل `content-foundation` داخل `startup-phases`.
- ربط `content-client` فعليًا مع `section-version-store` لكل الأقسام.
- تفعيل payload cache انتقائي للأقسام الخفيفة فقط:
  - `app_config`
  - `azkar`
  - `daily_content`
- تفعيل **version-only sync** للأقسام الثقيلة حاليًا:
  - `duas`
  - `stories`

## لماذا لم نخزن payload للأدعية والقصص؟
لأن payload هذه الأقسام كبيرة وموجودة أصلًا داخل bundle المحلي. تكرارها داخل `localStorage` في المرحلة الأولى يزيد خطر الوصول إلى quota بسرعة، بدون مكسب حقيقي. لذلك القرار الحالي هو:
- مزامنة الإصدار الآن
- إبقاء payload cache الحقيقي لهذه الأقسام إلى مرحلة الـ API/D1

## ما تم تأجيله عمدًا
- Cloudflare Pages Functions / Workers
- D1 schema + migrations
- Public API الحقيقي
- Admin login / CRUD
- metrics backend

## ما نُفذ في هذه الدفعة الإضافية
- ربط `content-foundation` مع runtime health و runtime diagnostics.
- إضافة telemetry واضحة لترحيل التخزين من المفتاح القديم إلى المفتاح الجديد.
- توسيع support bundle ليشمل حالة content foundation وتفاصيل migration.
- إضافة scaffold أولي لـ Cloudflare Pages Functions بدون ربط runtime الحالي بعد.

## Phase 1 closeout additions
- تم اعتماد `dist/` كـ deployable package boundary واضح
- تم اعتماد `dalil-almuslim-dist.zip` كـ artifact رسمي للنشر اليدوي
- تم توثيق Cloudflare Direct Upload كخط نشر حي مؤقت
- تم فصل live target الحالي عن Git-integrated build target غير المستقر
