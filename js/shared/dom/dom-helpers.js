// js/shared/dom/dom-helpers.js

/**
 * ====================================================================
 * DOM Helpers
 * ====================================================================
 * مجموعة أدوات موحدة للتعامل مع DOM:
 * - الوصول الآمن للعناصر
 * - تحديث النصوص
 * - التحكم في الإخفاء/الإظهار
 * - تحديث أشرطة التقدم
 * - إدارة الكلاسات وخصائص ARIA
 * - التعامل مع القوالب والأطفال
 */

const PROGRESS_CLASS_PREFIX = 'u-progress-';
const PROGRESS_CLASS_PATTERN = /^u-progress-(?:100|\d{1,2})$/;

// ==============================
// الوصول إلى العناصر
// ==============================

/**
 * الحصول على عنصر بواسطة id
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function getById(id) {
    if (typeof id !== 'string' || !id.trim()) return null;
    return document.getElementById(id);
}

/**
 * تحويل معامل (قد يكون id أو عنصر) إلى عنصر DOM
 * @param {string|HTMLElement} elementOrId
 * @returns {HTMLElement|null}
 */
export function resolveElement(elementOrId) {
    if (!elementOrId) return null;
    if (typeof elementOrId === 'string') {
        return getById(elementOrId);
    }
    return elementOrId;
}

// ==============================
// إنشاء العناصر
// ==============================

/**
 * إنشاء عنصر Icon مع aria-hidden افتراضيًا
 * @param {string|string[]} classNames
 * @param {{tag?: string, ariaHidden?: boolean}} [options]
 * @returns {HTMLElement}
 */
export function createIconElement(classNames, { tag = 'i', ariaHidden = true } = {}) {
    const icon = document.createElement(tag);
    const safeClassNames = Array.isArray(classNames)
        ? classNames.filter(Boolean).join(' ')
        : String(classNames || '').trim();

    if (safeClassNames) {
        icon.className = safeClassNames;
    }
    if (ariaHidden) {
        icon.setAttribute('aria-hidden', 'true');
    }
    return icon;
}

/**
 * إنشاء عنصر نصي بسيط
 * @param {string} tagName
 * @param {*} value
 * @param {string} [className]
 * @returns {HTMLElement}
 */
export function createTextElement(tagName, value, className = '') {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    element.textContent = String(value ?? '');
    return element;
}

/**
 * تفريغ عنصر من جميع أطفاله
 * @param {string|HTMLElement} elementOrId
 */
export function clearElement(elementOrId) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    el.replaceChildren();
}

// ==============================
// تحديث المحتوى
// ==============================

/**
 * تعيين نص العنصر (آمن)
 * @param {string|HTMLElement} elementOrId
 * @param {*} value
 */
export function setTextContent(elementOrId, value) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    el.textContent = String(value ?? '');
}

/**
 * إدراج HTML آمن (يزيل script tags)
 * @param {string|HTMLElement} elementOrId
 * @param {string} html
 */
/**
 * Only use with trusted, app-generated HTML strings. This is not a general-purpose sanitizer.
 */
export function appendTrustedHTML(elementOrId, html) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    const template = document.createElement('template');
    template.innerHTML = html;
    const scripts = template.content.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    el.replaceChildren(template.content.cloneNode(true));
}

/**
 * نص آمن (مشابه لـ setTextContent ولكن مع معامل مختلف)
 * @param {HTMLElement} element
 * @param {string} text
 */
export function safeText(element, text) {
    if (!element) return;
    element.textContent = String(text);
}

// ==============================
// التحكم في الإظهار/الإخفاء
// ==============================

/**
 * إخفاء أو إظهار عنصر باستخدام خاصية hidden
 * @param {string|HTMLElement} elementOrId
 * @param {boolean} hidden
 */
export function toggleHidden(elementOrId, hidden) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    el.hidden = Boolean(hidden);
}

// ==============================
// أشرطة التقدم
// ==============================

export function clampProgressPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function buildProgressClassName(value) {
    return `${PROGRESS_CLASS_PREFIX}${clampProgressPercent(value)}`;
}

function clearProgressClasses(element) {
    if (!element) return;
    const classNames = [...element.classList].filter((className) => PROGRESS_CLASS_PATTERN.test(className));
    if (classNames.length) {
        element.classList.remove(...classNames);
    }
}

/**
 * تحديث عرض progress bar (نسبة مئوية 0..100)
 * @param {string|HTMLElement} elementOrId
 * @param {number} percent
 */
export function setProgressPercent(elementOrId, percent) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    const safePercent = clampProgressPercent(percent);
    clearProgressClasses(el);
    el.classList.add(buildProgressClassName(safePercent));
    el.setAttribute('aria-valuenow', String(safePercent));
}

/**
 * تحديث عرض progress bar (نسبة 0..1)
 * @param {string|HTMLElement} elementOrId
 * @param {number} ratio (0..1)
 */
export function setProgress(elementOrId, ratio) {
    const safeRatio = Math.max(0, Math.min(Number(ratio) || 0, 1));
    setProgressPercent(elementOrId, safeRatio * 100);
}

// ==============================
// إدارة الكلاسات
// ==============================

/**
 * إضافة/إزالة كلاس
 * @param {string|HTMLElement} elementOrId
 * @param {string} className
 * @param {boolean} [force] - true للإضافة، false للإزالة، بدون toggle
 */
export function toggleClass(elementOrId, className, force) {
    const el = resolveElement(elementOrId);
    if (!el || typeof className !== 'string' || !className.trim()) return;
    if (typeof force === 'boolean') {
        el.classList.toggle(className, force);
    } else {
        el.classList.toggle(className);
    }
}

// ==============================
// خصائص ARIA
// ==============================

/**
 * تعيين aria-pressed
 * @param {string|HTMLElement} elementOrId
 * @param {boolean} value
 */
export function setAriaPressed(elementOrId, value) {
    const el = resolveElement(elementOrId);
    if (!el) return;
    el.setAttribute('aria-pressed', String(Boolean(value)));
}

export const safeHTML = appendTrustedHTML;
