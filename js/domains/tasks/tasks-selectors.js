import { tasksStore } from './tasks-store.js';

export function createTaskRecord(taskData = {}) {
    return {
        id: taskData.id || tasksStore.createTaskId('task'),
        text: typeof taskData.text === 'string' ? taskData.text.trim() : '',
        completed: Boolean(taskData.completed),
        createdAt: taskData.createdAt || new Date().toISOString(),
        updatedAt: taskData.updatedAt || new Date().toISOString(),
        isDefault: Boolean(taskData.isDefault)
    };
}

export const TasksSelectors = {
    getState() {
        return tasksStore.getState();
    },

    getAll() {
        return tasksStore.getAll();
    },

    getById(taskId) {
        return tasksStore.findById(taskId);
    },

    getCompletedCount() {
        return tasksStore.getCompletedCount();
    },

    getTotalCount() {
        return tasksStore.getTotalCount();
    },

    getLifetimeCompleted() {
        return tasksStore.getLifetimeCompleted();
    },

    normalizeTasks(tasks) {
        if (!Array.isArray(tasks)) return [];

        return tasks
            .map((task) => createTaskRecord(task))
            .filter((task) => task.text);
    }
};
