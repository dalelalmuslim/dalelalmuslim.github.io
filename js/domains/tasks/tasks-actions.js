import { tasksStore } from './tasks-store.js';
import { DEFAULT_TASK_DEFINITIONS } from './tasks-defaults.js';
import { TasksSelectors, createTaskRecord } from './tasks-selectors.js';

const MAX_TASK_TEXT_LENGTH = 200;

function buildDefaultTasks() {
    return DEFAULT_TASK_DEFINITIONS.map((task) => createTaskRecord({
        ...task,
        completed: false
    }));
}

function hasTaskCollectionChanged(currentTasks, nextTasks) {
    try {
        return JSON.stringify(currentTasks || []) !== JSON.stringify(nextTasks || []);
    } catch {
        return true;
    }
}

export const TasksActions = {
    ensureState() {
        const currentTasks = TasksSelectors.getAll();
        let nextTasks = TasksSelectors.normalizeTasks(currentTasks);
        let hasChanges = hasTaskCollectionChanged(currentTasks, nextTasks);

        if (nextTasks.length === 0) {
            nextTasks = buildDefaultTasks();
            hasChanges = true;
        }

        const existingIds = new Set(nextTasks.map((task) => task.id));

        DEFAULT_TASK_DEFINITIONS.forEach((defaultTask) => {
            if (!existingIds.has(defaultTask.id)) {
                nextTasks.push(createTaskRecord({
                    ...defaultTask,
                    completed: false
                }));
                hasChanges = true;
            }
        });

        if (hasChanges) {
            tasksStore.setAll(nextTasks);
        }

        return nextTasks;
    },

    restoreDefaults() {
        const currentTasks = this.ensureState();
        const customTasks = currentTasks.filter((task) => !task.isDefault);
        const defaults = buildDefaultTasks();
        return tasksStore.setAll([...defaults, ...customTasks]);
    },

    addTask(text) {
        const safeText = typeof text === 'string' ? text.trim().slice(0, MAX_TASK_TEXT_LENGTH) : '';
        if (!safeText) return null;

        const newTask = createTaskRecord({ text: safeText, isDefault: false });
        tasksStore.append(newTask);
        return newTask;
    },

    toggleTask(taskId) {
        const currentTask = TasksSelectors.getById(taskId);
        if (!currentTask) {
            return null;
        }

        const wasCompleted = Boolean(currentTask.completed);
        const updatedTask = tasksStore.updateById(taskId, {
            completed: !wasCompleted,
            updatedAt: new Date().toISOString()
        });

        if (!wasCompleted && updatedTask?.completed) {
            tasksStore.incrementLifetimeCompleted(1);
        }

        return updatedTask;
    },

    removeCustomTask(taskId) {
        const task = TasksSelectors.getById(taskId);
        if (!task || task.isDefault) {
            return null;
        }

        return tasksStore.removeById(taskId);
    }
};
