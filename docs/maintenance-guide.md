# Maintenance Guide

هذا الدليل يحدد كيف تطور المشروع بعد إعادة الهيكلة بدون تدمير boundaries الجديدة.

## 1) قبل أي تعديل
اسأل نفسك:
- هل هذا Feature concern؟
- أم Domain state concern؟
- أم Service concern؟
- أم App shell concern؟
- أم Router concern؟

لو الإجابة غير واضحة، لا تبدأ بنقل كود عشوائي.

## 2) أين تضع الكود الجديد؟

### لو المنطق يخص قسمًا واحدًا
ضعه داخل `js/features/<feature>/...`

### لو المنطق persistent/shared state
ضعه داخل `js/domains/<domain>/*` أو داخل `js/app/ui/ui-state.js` لو كان app-level ephemeral فقط

### لو المنطق browser/platform/integration
ضعه داخل `js/services/*`

### لو المنطق top-level application composition
ضعه داخل `js/app/*`

### لو المنطق navigation/section lifecycle
ضعه داخل `js/router/*`

## 3) متى تنشئ service جديدة؟
أنشئ service جديدة عندما:
- المنطق يتعامل مع browser APIs أو integration خارجي
- المنطق cross-feature
- المنطق ليس UI-specific
- المنطق يحتاج isolation للاختبار والصيانة

## 4) متى تنشئ store أو actions جديدة؟
أنشئها عندما:
- ownership state واضح لدومين معين
- state مشتركة أو persistent
- الوصول المباشر إلى storage سيبدأ يتكرر
- تحتاج write paths واضحة بدل mutation عشوائي

لا تنشئ store فقط لأن الملف أصبح طويلًا؛ store/actions تُنشأ لامتلاك state domain حقيقي.

## 5) مراجعة أي PR أو تعديل كبير
تحقق من الآتي:
- لا توجد imports عرضية بين features
- لا يوجد browser API usage مباشر داخل feature عندما يوجد adapter/service جاهز
- لا يوجد state mutation من أماكن متعددة بلا owner واضح
- لا يوجد إعادة خلق facade root قديمة
- لا توجد ملفات تجمع DOM + storage + routing + feature logic معًا

## 6) ملفات لا يجب إعادتها
لا تعيد إنشاء:
- `js/content.js`
- `js/tasks.js`
- `js/quran.js`
- `js/masbaha.js`
- `js/storage.js`
- `js/notifications.js`
- `js/achievements.js`
- `js/rewards.js`
- `js/ads.js`
- `js/app.js`
- `js/firebase-core.js`
- `js/ui-state.js`

## 7) التحقق بعد أي تعديل
شغّل على الأقل:
```bash
node tools/build-sw-manifest.mjs
node tools/verify-architecture.mjs
```

- إذا عدّلت ملفات runtime ولم تُعد توليد `sw-manifest.js`، سيعتبر verifier أن الـ manifest stale.
- هذا يمنع drift بين الملفات الفعلية وبين precache الخاص بالـ PWA.

ثم نفّذ smoke check يدوي على المسارات الحرجة.

## 8) سياسة الإعلانات
- لا تشغّل ad slots مباشرة من features
- استخدم policy + services boundary فقط
- التمكين المستقبلي يجب أن يكون configurable ومركزي

## 9) سياسة Firebase
- Auth only
- أي اقتراح لـ Firestore/state sync يجب أن يمر بقرار معماري جديد واضح، وليس تعديلًا سريعًا
