function getNavigatorApi() {
    return typeof navigator !== 'undefined' ? navigator : null;
}

export function canUseNativeShare() {
    const nav = getNavigatorApi();
    return typeof nav?.share === 'function';
}

export async function sharePayload(payload) {
    if (!canUseNativeShare()) return false;

    try {
        await navigator.share(payload);
        return true;
    } catch (error) {
        return false;
    }
}

export async function writeClipboardText(text) {
    const nav = getNavigatorApi();
    if (typeof nav?.clipboard?.writeText !== 'function') {
        return false;
    }

    try {
        await nav.clipboard.writeText(String(text ?? ''));
        return true;
    } catch (error) {
        return false;
    }
}
