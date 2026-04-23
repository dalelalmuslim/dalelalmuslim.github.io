# Phase 2 — Remote-first Content Client

هذا batch يربط التطبيق نفسه مع Public Content API بدون rewrite.

## ما الذي تغير
- `content-client` أصبح يعتمد على `stored section versions` بدل default static versions.
- تمت إضافة `content-provider-remote.js` لقراءة:
  - `/api/public/versions`
  - `/api/public/content/*`
- أقسام `duas` و `stories` أصبحت payload-cached بدل version-only لأن استهلاكهما الحالي متزامن داخل التطبيق.
- `azkar/duas/stories/daily-content` accessors أصبحت تقرأ من cached remote payload عند توفره.
- Service Worker صار يوجّه `/api/public/*` عبر network-first بدل runtime cache-first.

## لماذا هذا التغيير
بدون هذه الدفعة كان التطبيق سيظل يستهلك local static content حتى بعد بناء API، خصوصًا في `duas` و `stories`، كما أن `getSectionVersion()` كان يعتمد على defaults بدل النسخ المخزنة فعليًا.

## النتيجة
- التطبيق يحاول جلب النسخ والـ payload من الـ API أولًا.
- عند النجاح يتم تحديث cache/version محليًا.
- عند الفشل يستمر التطبيق على local fallback بدون كسر runtime الحالي.
