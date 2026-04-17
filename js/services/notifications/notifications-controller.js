import { createDefaultNotificationSettings } from './notifications-defaults.js';
import { createNotificationsSettingsController } from './notifications-settings-controller.js';
import { createNotificationsRuntimeController } from './notifications-runtime-controller.js';

const notificationsController = {
    initialized: false,
    settings: createDefaultNotificationSettings(),

    init() {
        if (this.initialized || typeof window === 'undefined') {
            return;
        }

        this.settingsController.loadSettings();
        this.settingsController.bindUI();
        this.runtimeController.bindVisibility();
        this.runtimeController.startChecker();
        this.initialized = true;
    }
};

const runtimeController = createNotificationsRuntimeController(notificationsController);
const settingsController = createNotificationsSettingsController({
    handleSaveClick: async () => settingsController.handleSaveClick(),
    showNotification: async (title, body) => runtimeController.showNotification(title, body)
});

Object.assign(notificationsController, runtimeController, settingsController, {
    runtimeController,
    settingsController
});

export { notificationsController };
export const notifications = notificationsController;
