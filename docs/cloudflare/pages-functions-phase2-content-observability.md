# Phase 2 — Batch 3: Public Content Source Observability

## الهدف
إضافة visibility فعلية لحالة مصادر المحتوى داخل التطبيق بعد إدخال Public Content API وremote-first content client.

## ما تم
- إنشاء service مستقلة لتتبع مصدر كل section (`remote`, `cache`, `local`, `fallback`).
- ربط `content-client` بهذه الخدمة أثناء:
  - versions sync
  - foundation warmup
  - payload cache reuse
  - local fallback
- إضافة بطاقة جديدة داخل الإعدادات لعرض حالة كل section ومصدره الحالي وإصداره.
- توسيع Support Bundle ليشمل `runtime.contentSources`.
- إضافة verification مخصصة للتأكد من observability plumbing.

## لماذا هذا مهم
بدون هذه الدفعة كان التطبيق يملك API ومزامنة فعلية، لكنه لا يملك visibility تشغيلية كافية توضح:
- هل الـ section الحالي جاء من Remote أم Cache أم Local fallback
- هل هناك drift بين النسخة الحالية والنسخة المخزنة
- هل warmup الخلفي اكتمل أم ما زال partial

## النتيجة
الآن يمكن تشخيص حالة المحتوى لكل section من داخل التطبيق ومن Support Bundle بدون الحاجة لقراءة logs فقط.
