import { APP_CONFIG } from '../../app/app-config.js';
import { sharePayload, writeClipboardText } from '../../services/platform/web-share.js';

export async function shareApp() {
    const url = APP_CONFIG.APP_URL;
    const text = `أنصحك بتجربة تطبيق "${APP_CONFIG.APP_NAME_AR}" المذهل 📱✨:

`;

    const didShare = await sharePayload({ title: APP_CONFIG.APP_NAME_AR, text, url });
    if (didShare) return true;

    return this.copyToClipboard(text + url);
}

export async function shareText(text) {
    const didShare = await sharePayload({ text });
    if (didShare) return true;

    return this.copyToClipboard(text);
}

export async function copyToClipboard(text) {
    const copied = await writeClipboardText(text);

    if (copied) {
        this.showToast('تم النسخ بنجاح!', 'success');
        return true;
    }

    this.showToast('تعذر النسخ.', 'error');
    return false;
}
