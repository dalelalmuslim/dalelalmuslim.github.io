import { createStorageTaskId, getStorageState, persistStorageState, updateStorageState } from '../../services/storage/storage-access.js';

function getTaskArray() {
    const tasks = getStorageState()?.tasks;
    return Array.isArray(tasks) ? tasks : [];
}

export const tasksStore = {
    getState() {
        return getStorageState();
    },

    createTaskId(prefix = 'task') {
        return createStorageTaskId(prefix);
    },

    getAll() {
        return getTaskArray();
    },

    setAll(tasks, { save = true } = {}) {
        return updateStorageState((state) => {
            state.tasks = Array.isArray(tasks) ? tasks : [];
            return state.tasks;
        }, { save }) || [];
    },

    persist() {
        persistStorageState();
    },

    append(task) {
        return updateStorageState((state) => {
            if (!Array.isArray(state.tasks)) {
                state.tasks = [];
            }

            state.tasks.push(task);
            return task;
        }) || null;
    },

    findById(taskId) {
        return this.getAll().find((task) => task?.id === taskId) || null;
    },

    findIndexById(taskId) {
        return this.getAll().findIndex((task) => task?.id === taskId);
    },

    updateById(taskId, updater) {
        return updateStorageState((state) => {
            if (!Array.isArray(state.tasks)) {
                state.tasks = [];
            }

            const index = state.tasks.findIndex((task) => task?.id === taskId);
            if (index < 0) return null;

            const currentTask = state.tasks[index];
            const nextTask = typeof updater === 'function'
                ? updater(currentTask)
                : { ...currentTask, ...(updater || {}) };

            if (!nextTask) return null;

            state.tasks[index] = nextTask;
            return nextTask;
        }) || null;
    },

    removeById(taskId) {
        return updateStorageState((state) => {
            if (!Array.isArray(state.tasks)) {
                state.tasks = [];
            }

            const index = state.tasks.findIndex((task) => task?.id === taskId);
            if (index < 0) return null;

            const [removedTask] = state.tasks.splice(index, 1);
            return removedTask || null;
        }) || null;
    },

    getCompletedCount() {
        return this.getAll().filter((task) => Boolean(task?.completed)).length;
    },

    getTotalCount() {
        return this.getAll().length;
    },

    getLifetimeCompleted() {
        return Number(getStorageState()?.tasksCompleted) || 0;
    },

    incrementLifetimeCompleted(step = 1) {
        return updateStorageState((state) => {
            state.tasksCompleted = Math.max(0, (Number(state.tasksCompleted) || 0) + Number(step || 0));
            return state.tasksCompleted;
        }) || 0;
    }
};
