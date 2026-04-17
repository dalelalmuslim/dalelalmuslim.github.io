const REGISTRY = Object.freeze({
  STARTUP_FAILURE: Object.freeze({
    code: 'BOOT-001',
    severity: 'error',
    category: 'startup',
    title: 'فشل في تهيئة التطبيق',
    action: 'راجع مراحل startup الفاشلة ثم أعد تحميل التطبيق.'
  }),
  STORAGE_FATAL: Object.freeze({
    code: 'STORE-001',
    severity: 'error',
    category: 'storage',
    title: 'فشل حرج في التخزين المحلي',
    action: 'تحقق من توفر localStorage أو امسح بيانات المتصفح ثم أعد المحاولة.'
  }),
  STORAGE_EPHEMERAL: Object.freeze({
    code: 'STORE-002',
    severity: 'warning',
    category: 'storage',
    title: 'التطبيق يعمل بدون حفظ دائم',
    action: 'استمر مؤقتًا، لكن لا تعتمد على حفظ طويل الأمد قبل عودة التخزين المحلي.'
  }),
  STORAGE_RECOVERED: Object.freeze({
    code: 'STORE-003',
    severity: 'warning',
    category: 'storage',
    title: 'تمت استعادة التخزين المحلي',
    action: 'راجع آخر تغييراتك وتأكد أن البيانات المسترجعة متسقة.'
  }),
  STORAGE_MIGRATED: Object.freeze({
    code: 'STORE-004',
    severity: 'warning',
    category: 'storage',
    title: 'تم ترحيل بيانات التخزين إلى namespace جديد',
    action: 'تحقق أن البيانات المتوقعة ما زالت ظاهرة، ثم اعتمد المفتاح الجديد فقط في الإصدارات القادمة.'
  }),
  CONTENT_FOUNDATION_FAILURE: Object.freeze({
    code: 'CONTENT-001',
    severity: 'error',
    category: 'content',
    title: 'فشل في تهيئة طبقة المحتوى',
    action: 'راجع نتائج content foundation وحدد القسم الذي فشل قبل متابعة أي تكامل مع API.'
  }),
  CONTENT_FOUNDATION_DEFERRED: Object.freeze({
    code: 'CONTENT-002',
    severity: 'warning',
    category: 'content',
    title: 'تم تأجيل تسخين بعض أقسام المحتوى',
    action: 'هذا متوقع مرحليًا، لكن راقب استمرار الاعتماد على warmup الخلفي قبل الانتقال إلى backend live sync.'
  }),
  DAY_CYCLE_PARTIAL: Object.freeze({
    code: 'DAY-001',
    severity: 'warning',
    category: 'day-cycle',
    title: 'فشل جزئي في تحديث بداية اليوم',
    action: 'افتح الأقسام المتأثرة يدويًا أو أعد تشغيل التطبيق إذا استمر الخلل.'
  }),
  SECTION_BOOT_FAILURE: Object.freeze({
    code: 'SECTION-001',
    severity: 'error',
    category: 'section',
    title: 'فشل تشغيل قسم',
    action: 'أعد فتح القسم، وإذا تكرر الخلل انسخ حزمة الدعم وأرسلها للمراجعة.'
  }),
  APP_WARNING: Object.freeze({
    code: 'APP-001',
    severity: 'warning',
    category: 'runtime',
    title: 'تحذير تشغيلي عام',
    action: 'راقب السجل التشغيلي وتأكد أن التحذير لا يتكرر.'
  }),
  APP_ERROR: Object.freeze({
    code: 'APP-002',
    severity: 'error',
    category: 'runtime',
    title: 'خطأ تشغيلي عام',
    action: 'راجِع تفاصيل الخطأ في حزمة الدعم ثم حدّد المسار الذي سبقه مباشرة.'
  }),
  PWA_WARNING: Object.freeze({
    code: 'PWA-001',
    severity: 'warning',
    category: 'pwa',
    title: 'تحذير في مسار التحديثات',
    action: 'تحقق من حالة service worker ومن توفر الشبكة.'
  }),
  PWA_ERROR: Object.freeze({
    code: 'PWA-002',
    severity: 'error',
    category: 'pwa',
    title: 'خطأ في مسار التحديثات',
    action: 'تحقق من service worker ثم نفذ فحص تحديثات يدوي.'
  }),
  AUTH_WARNING: Object.freeze({
    code: 'AUTH-001',
    severity: 'warning',
    category: 'auth',
    title: 'تحذير في مسار المصادقة',
    action: 'تحقق من حالة الجلسة ومسار تسجيل الدخول الحالي.'
  }),
  AUTH_ERROR: Object.freeze({
    code: 'AUTH-002',
    severity: 'error',
    category: 'auth',
    title: 'خطأ في مسار المصادقة',
    action: 'أعد محاولة الدخول أو راجع دعم المصادقة على الجهاز الحالي.'
  })
});

function withDefaults(descriptor, overrides = {}) {
  return Object.freeze({
    code: descriptor.code,
    severity: overrides.severity || descriptor.severity,
    category: overrides.category || descriptor.category,
    title: overrides.title || descriptor.title,
    action: overrides.action || descriptor.action
  });
}

export function getDiagnosticDescriptor(key, overrides = {}) {
  const descriptor = REGISTRY[key] || REGISTRY.APP_WARNING;
  return withDefaults(descriptor, overrides);
}

export function listDiagnosticDescriptors() {
  return Object.freeze(Object.entries(REGISTRY).map(([key, value]) => Object.freeze({ key, ...value })));
}

export function resolveLogDescriptor(detail = {}) {
  const scope = String(detail.scope || 'App').toLowerCase();
  const level = detail.level === 'error' ? 'error' : 'warning';

  if (scope.includes('pwa') || scope.includes('update')) {
    return level === 'error' ? REGISTRY.PWA_ERROR : REGISTRY.PWA_WARNING;
  }

  if (scope.includes('auth') || scope.includes('firebase')) {
    return level === 'error' ? REGISTRY.AUTH_ERROR : REGISTRY.AUTH_WARNING;
  }

  return level === 'error' ? REGISTRY.APP_ERROR : REGISTRY.APP_WARNING;
}
