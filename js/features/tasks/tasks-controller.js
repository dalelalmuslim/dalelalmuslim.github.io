import { emitStatsChanged } from '../../domains/stats/stats-events.js';
import { achievements } from '../../services/engagement/index.js';
import { TasksActions, TasksSelectors } from '../../domains/tasks/index.js';
import { StatsSelectors } from '../../domains/stats/stats-selectors.js';
import { TasksUI } from './tasks-view.js';
import { scheduleRender } from '../../shared/render/render-scheduler.js';
import { vibrateDevice } from '../../services/platform/haptics.js';
import { getTasksDomElement, getTasksRenderContext } from './tasks-dom.js';

const MAX_TASK_TEXT_LENGTH = 200;

export const tasks = {
    taskToDeleteId: null,
    initialized: false,

    queueTasksRerender() {
        scheduleRender('tasks-render', () => this.render());
        emitStatsChanged({ source: 'tasks' });
    },

    init() {
        if (!TasksUI) return;
        if (!this.initialized) {
            TasksActions.ensureState();
            this.initialized = true;
        }
        this.refreshSurface();
    },

    refreshHeader() {
        TasksUI.renderHeaderOnly();
    },

    refreshVisibleState() {
        this.refreshSurface();
    },

    refreshSurface() {
        TasksActions.ensureState();
        TasksUI.renderHeaderOnly();

        const tasksList = TasksSelectors.getAll();
        const { template, listRoot, emptyState } = getTasksRenderContext();

        TasksUI.renderList(tasksList, template, listRoot, this, emptyState);
    },

    restoreDefaultTasks() {
        TasksUI.showModal('restoreTasksModal');
    },

    closeRestoreModal() {
        TasksUI.hideModal('restoreTasksModal');
    },

    confirmRestoreTasks() {
        TasksActions.restoreDefaults();

        this.queueTasksRerender();
        this.closeRestoreModal();
        TasksUI.notify('تم استعادة المهام الافتراضية');
    },

    addTask() {
        const input = getTasksDomElement('input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        if (text.length > MAX_TASK_TEXT_LENGTH) {
            TasksUI.notify('الحد الأقصى لطول المهمة هو 200 حرف');
            return;
        }

        TasksActions.addTask(text);

        input.value = '';

        this.queueTasksRerender();
        TasksUI.notify('تمت الإضافة بنجاح ✨');
    },

    toggleTask(taskId) {
        const task = TasksSelectors.getById(taskId);
        if (!task) return;

        const updatedTask = TasksActions.toggleTask(taskId);
        if (!updatedTask) return;

        achievements?.checkAchievements?.();
        this.queueTasksRerender();
        vibrateDevice(40);

        const completed = StatsSelectors.getCompletedTasksCount();
        const total = StatsSelectors.getTotalTasksCount();

        if (completed === total && total > 0) {
            TasksUI.notify(StatsSelectors.getStatsSummary().smartMessage);
        }
    },

    deleteTask(taskId) {
        this.taskToDeleteId = taskId;
        TasksUI.showModal('deleteTaskModal');
    },

    closeDeleteTaskModal() {
        TasksUI.hideModal('deleteTaskModal');
        this.taskToDeleteId = null;
    },

    confirmDeleteTask() {
        if (this.taskToDeleteId === null) return;

        const task = TasksSelectors.getById(this.taskToDeleteId);

        if (!task) {
            this.closeDeleteTaskModal();
            return;
        }

        if (task.isDefault) {
            this.closeDeleteTaskModal();
            TasksUI.notify('لا يمكن حذف المهام الافتراضية');
            return;
        }

        TasksActions.removeCustomTask(this.taskToDeleteId);

        this.queueTasksRerender();
        this.closeDeleteTaskModal();
        TasksUI.notify('تم حذف المهمة');
    },

    render() {
        this.refreshSurface();
    }
};
