import { isPlainObject } from './storage-normalizers-core.js';

export function createTaskId(prefix = 'task') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeTask(task, index = 0) {
    const safeTask = isPlainObject(task) ? task : {};
    const text = typeof safeTask.text === 'string' ? safeTask.text.trim() : '';

    if (!text) return null;

    const now = new Date().toISOString();
    const createdAt = typeof safeTask.createdAt === 'string' && safeTask.createdAt
        ? safeTask.createdAt
        : now;

    return {
        id: typeof safeTask.id === 'string' && safeTask.id.trim()
            ? safeTask.id.trim()
            : createTaskId(`task${index}`),
        text,
        completed: Boolean(safeTask.completed),
        createdAt,
        updatedAt: typeof safeTask.updatedAt === 'string' && safeTask.updatedAt
            ? safeTask.updatedAt
            : createdAt,
        isDefault: Boolean(safeTask.isDefault)
    };
}

export function normalizeTasks(tasks) {
    if (!Array.isArray(tasks)) return [];

    const seenIds = new Set();
    const normalized = [];

    tasks.forEach((task, index) => {
        const safeTask = normalizeTask(task, index);
        if (!safeTask) return;

        if (seenIds.has(safeTask.id)) {
            safeTask.id = createTaskId(`taskdup${index}`);
        }

        seenIds.add(safeTask.id);
        normalized.push(safeTask);
    });

    return normalized;
}

export function normalizeAchievements(achievements) {
    return Array.isArray(achievements) ? Array.from(new Set(achievements.filter(Boolean))) : [];
}

export function normalizeCompletedTasks(completedTasks, tasks = []) {
    const validIds = new Set((Array.isArray(tasks) ? tasks : []).map(task => task.id));
    return Array.isArray(completedTasks) ? completedTasks.filter(id => validIds.has(id)) : [];
}
