# Index fragments

هذه الملفات هي **مصدر الحقيقة** لواجهة `index.html`.

التقسيم هنا مبني على المسؤوليات، وليس على الحجم فقط:
- `head.html`: تعريفات الـ document والـ external policies/resources
- `shell-start.html` و`shell-end.html`: إطار الصفحة الرئيسي
- `content/*`: مجموعات الأقسام الرئيسية بحسب دورها داخل التطبيق
- `dialogs.html`: جميع الـ dialogs / modals
- `templates.html`: قوالب الـ DOM reusable templates

لإعادة توليد `index.html`:

```bash
node tools/build-index.mjs
```
