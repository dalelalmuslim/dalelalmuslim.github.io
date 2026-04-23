# Repo and Deploy Sequence

## القرار التنفيذي
- **GitHub الآن بعد اجتياز الجاهزية المحلية**.
- **Cloudflare Pages بعد أول push ناجح إلى GitHub**.
- **لا نربط Cloudflare قبل تثبيت المستودع والـ CI والنسخة المرجعية على GitHub**.

## الترتيب الصحيح
1. افتح المشروع محليًا وشغّل:
   - `npm install`
   - `npm run ready:local`
2. أنشئ مستودع GitHub فارغًا باسم `dalil-almuslim`.
3. من داخل جذر المشروع:
   - `git init`
   - `git branch -M main`
   - `git add .`
   - `git commit -m "chore: stage1 foundation closeout"`
   - `git remote add origin <YOUR_GITHUB_REPO_URL>`
   - `git push -u origin main`
4. بعد نجاح الـ push، اربط المشروع مع Cloudflare Pages من GitHub.
5. في Cloudflare Pages استخدم:
   - Build command: `npm ci && npm run build:shell`
   - Build output directory: `.`
   - Root directory: اتركه فارغًا طالما المشروع في root
6. لا تبدأ D1 أو Functions bindings الحقيقية إلا بعد نجاح أول deploy ثابت.

## لماذا هذا الترتيب
- GitHub هو **source of truth** للكود والـ history والـ CI.
- Cloudflare يجب أن يقرأ من مستودع ثابت، لا من مجلد محلي متغير.
- أي ربط مبكر مع Cloudflare قبل GitHub سيعقّد التشخيص ويزيد drift بين النسخ.

## ملاحظات تنفيذية
- وجود ملف `.nvmrc` يثبّت نسخة Node المحلية والنسخة المستخدمة في CI/Cloudflare.
- ملف `wrangler.toml` موجود كـ scaffold فقط، وليس تصريحًا بالانتقال إلى backend phase.
- إذا لم تكن جاهزًا لـ GitHub اليوم، أكمل العمل محليًا على نفس baseline، لكن **لا تبدأ Cloudflare قبل أول push**.

## بعد أول نشر حي
بعد نجاح أول `push` إلى GitHub وأول نشر فعلي على Cloudflare، يصبح الترتيب التشغيلي كالتالي:

1. اعمل التعديل داخل المشروع
2. شغّل `npm run release:manual-cloudflare`
3. ارفع `dalil-almuslim-dist.zip` إلى مشروع Cloudflare الحي `dalil-almuslim-web`
4. ادفع الكود إلى GitHub كالمعتاد

هذا الترتيب مؤقت إلى أن يصبح Git-integrated deploy مستقرًا بما يكفي ليعود كخط النشر الأساسي.
