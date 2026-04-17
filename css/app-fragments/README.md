# App CSS fragments

هذه الملفات هي **مصدر الحقيقة** لـ `css/app.css`.

التقسيم هنا مبني على المسؤوليات المشتركة:
- `01-base.css`: reset/base element rules
- `02-typography.css`: النصوص العامة
- `03-a11y.css`: focus/hidden/accessibility helpers
- `04-controls.css`: buttons/inputs الأساسية
- `05-feedback.css`: toast/skeleton feedback patterns
- `06-surfaces.css`: surfaces/helpers المشتركة
- `07-utilities.css`: utility classes
- `08-banners-empty-motion.css`: banners/empty-state/motion preferences

لإعادة توليد `css/app.css`:

```bash
node tools/build-app-css.mjs
```
