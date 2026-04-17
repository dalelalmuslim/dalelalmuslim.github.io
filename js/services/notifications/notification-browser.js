export function isNotificationSupported() {
    return 'Notification' in window;
}

export async function ensureNotificationPermission() {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }

    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Notification.permission;
    }

    return Notification.requestPermission();
}

export async function showBrowserNotification(title, body) {
    if (!isNotificationSupported()) return;

    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            if (registration) {
                await registration.showNotification(title, {
                    body,
                    icon: './assets/icons/icon-192x192.png',
                    badge: './assets/icons/icon-192x192.png',
                    vibrate: [200, 100, 200, 100, 200],
                    tag: `azkar-notification-${Date.now()}`,
                    renotify: true,
                    data: { url: './index.html' }
                });
                return;
            }
        } catch (error) {
            // fallback to plain Notification below
        }
    }

    try {
        new Notification(title, { body, icon: './assets/icons/icon-192x192.png' });
    } catch (error) {
        // ignore browser notification fallback failure
    }
}
