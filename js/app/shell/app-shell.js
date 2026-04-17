let shell = null;
let pendingUpdateWorker = null;

export function registerAppShell(nextShell) {
    shell = nextShell || null;
    if (shell && pendingUpdateWorker) {
        shell.newWorker = pendingUpdateWorker;
    }
}

export function getAppShell() {
    return shell;
}

export function showToast(message, type = 'success') {
    return shell?.showToast?.(message, type);
}

export function shareText(text) {
    return shell?.shareText?.(text);
}

export function copyToClipboard(text) {
    return shell?.copyToClipboard?.(text);
}

export function showUpdateBanner() {
    return shell?.showUpdateBanner?.();
}

export function updateOnlineStatus() {
    return shell?.updateOnlineStatus?.();
}

export function updateUpdateStatus(status) {
    return shell?.setUpdateStatus?.(status);
}

export function recordCacheUpdate(payload) {
    return shell?.recordCacheUpdate?.(payload);
}

export function setPendingUpdateWorker(worker) {
    pendingUpdateWorker = worker || null;
    if (shell && pendingUpdateWorker) {
        shell.newWorker = pendingUpdateWorker;
    }
}
