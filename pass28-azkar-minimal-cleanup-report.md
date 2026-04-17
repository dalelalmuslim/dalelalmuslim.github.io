# Pass 28 — Azkar Minimal Cleanup & Daily-Use Simplification

## Scope
تنفيذ cleanup فعلي داخل **قسم الأذكار فقط** بهدف جعله:
- أبسط
- أهدأ بصريًا
- أسرع في بدء الجلسة
- أقرب لنمط الاستخدام اليومي المتكرر

## What changed

### 1) Removed non-essential visual noise
- حذف زر **المسبحة** من hero داخل قسم الأذكار
- حذف الزخارف `azkar-hero__ornament` / orbs من الـ hero
- الإبقاء على hero أخف وأكثر مباشرة

### 2) Simplified category cards
- حذف `azkar-category-card__meta`
- حذف `azkar-category-card__chevron`
- الإبقاء على:
  - icon
  - state
  - title
  - short description
  - progress
- تبسيط progress label بحيث لا تعرض نسبة + نص مزدوج بشكل مزعج

### 3) Simplified insight card
- حذف `azkarInsightActions`
- تقليل insight إلى:
  - عنوان
  - hint
  - metrics مختصرة
  - chips مساعدة فقط عند وجود قيمة فعلية

### 4) Simplified session header
- حذف stats blocks القديمة الثقيلة
- استبدالها بـ summary strip بسيط:
  - `azkarSessionProgressLabel`
  - `azkarSessionRemainingLabel`
- تقليل quick meta إلى عنصرين كحد أقصى

### 5) Reduced session tools
- الإبقاء فقط على:
  - Focus
  - Large Text
  - Favorite
- حذف:
  - Reminder toggle من toolbar
  - Vibration toggle من toolbar

### 6) Simplified item cards
- حذف زر **Share** من بطاقة الذكر
- الإبقاء على:
  - النص
  - المرجع
  - progress
  - counter CTA
  - copy button
- نقل copy ليكون secondary action واضح داخل footer مبسط
- إزالة `text-align: justify` واستبداله بمحاذاة قراءة أنسب للعربية
- رفع readability للحالة المكتملة بدل بهتان قوي

### 7) Visual cleanup
- إلغاء blur من surfaces المتكررة داخل قسم الأذكار
- تخفيف shadow depth
- تقليل كثافة chips والحركة
- تحسين spacing العمودي والاتساق بين main/session views
- ضبط sticky filters بشكل أكثر منطقية

## Files changed
- `src/index-fragments/content/primary-content.html`
- `src/index-fragments/templates.html`
- `css/features/azkar.css`
- `js/features/azkar/azkar-dom.js`
- `js/features/azkar/azkar-controller.js`
- `js/features/azkar/azkar-grid-renderers.js`
- `js/features/azkar/azkar-header-renderers.js`
- `js/features/azkar/azkar-session-renderers.js`
- regenerated `index.html`
- regenerated `sw-manifest.js`

## Verification
نجح بعد التنفيذ:
- `node tools/build-static-shell.mjs`
- `node tools/verify-browser-module-graph.mjs`
- `node tools/verify-dom-safety.mjs`
- `node tools/verify-external-boundaries.mjs`
- `node tools/verify-startup-dependencies.mjs`
- `node tools/verify-feature-startup-plan.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`
- `node day_cycle_validation_gate.mjs`

## Verdict
Pass 28 نجحت.

قسم الأذكار الآن أقرب إلى:
- **daily return surface**
- **habit-first flow**
- **simpler, cleaner, calmer UI**

بدل أن يكون mini-dashboard غني بالعناصر الثانوية.
