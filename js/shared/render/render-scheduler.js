import { appLogger } from '../logging/app-logger.js';

// js/shared/render/render-scheduler.js

const queuedJobs = new Map();
let scheduled = false;

function flushQueue() {
    scheduled = false;
    const jobs = Array.from(queuedJobs.values());
    queuedJobs.clear();

    for (const job of jobs) {
        try {
            job();
        } catch (error) {
            appLogger.error('Render job failed:', error);
        }
    }
}

export function scheduleRender(key, job) {
    if (typeof key !== 'string' || !key.trim() || typeof job !== 'function') {
        return;
    }

    // إذا تم جدولة نفس المفتاح عدة مرات قبل التنفيذ، فسيتم استبدال الوظيفة السابقة بالأخيرة.
    // هذا يمنع التنفيذ المتكرر لنفس النوع من التحديثات.
    queuedJobs.set(key, job);

    if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flushQueue);
    }
}