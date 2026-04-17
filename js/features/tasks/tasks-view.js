import { showToast } from '../../app/shell/app-shell.js';
import { TasksHeaderState } from './tasks-header-state.js';
import {
    createIconElement,
    setTextContent,
    toggleHidden,
    toggleClass,
    setAriaPressed,
} from '../../shared/dom/dom-helpers.js';
import { closeModal, openModal } from '../../app/ui/modal-manager.js';

function updateToggleButtonIcon(toggleBtn, isCompleted) {
    if (!toggleBtn) return;
    const icon = createIconElement(
        isCompleted
            ? ['fa-solid', 'fa-circle-check', 'tasks__toggle-icon', 'tasks__toggle-icon--done']
            : ['fa-regular', 'fa-circle', 'tasks__toggle-icon']
    );
    toggleBtn.replaceChildren(icon);
}

export const TasksUI = {
    getElement(id) {
        return document.getElementById(id);
    },

    showModal(id) {
        openModal(this.getElement(id));
    },

    hideModal(id) {
        closeModal(this.getElement(id));
    },

    notify(message, type = 'success') {
        showToast(message, type);
    },

    renderBadge() {
        setTextContent('tasksBadgeText', TasksHeaderState.getBadge());
    },

    renderMotivation() {
        setTextContent('tasksMotivationText', TasksHeaderState.getMessage());
    },

    renderHeaderOnly() {
        this.renderBadge();
        this.renderMotivation();
    },

    renderEmptyState(listRoot, emptyStateElement, isEmpty) {
        toggleHidden(emptyStateElement, !isEmpty);
        toggleHidden(listRoot, isEmpty);
    },

    updateTaskCardState(taskCard, task) {
        if (!taskCard || !task) return;

        toggleClass(taskCard, 'is-completed', Boolean(task.completed));

        const toggleBtn = taskCard.querySelector('[data-role="toggle-task"]');
        if (toggleBtn) {
            updateToggleButtonIcon(toggleBtn, Boolean(task.completed));
            setAriaPressed(toggleBtn, task.completed);
        }

        const deleteBtn = taskCard.querySelector('[data-role="delete-task"]');
        if (deleteBtn) {
            toggleHidden(deleteBtn, Boolean(task.isDefault));
        }
    },

    renderTaskItem(task, template, controller) {
        if (!template?.content?.firstElementChild || !task?.id || !controller) {
            return null;
        }

        const clone = template.content.cloneNode(true);
        const taskCard = clone.firstElementChild;
        if (!taskCard) {
            return null;
        }

        taskCard.dataset.taskId = task.id;

        const taskText = taskCard.querySelector('[data-role="task-text"]');
        setTextContent(taskText, task.text || '');

        const toggleBtn = taskCard.querySelector('[data-role="toggle-task"]');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => controller.toggleTask(task.id));
        }

        const deleteBtn = taskCard.querySelector('[data-role="delete-task"]');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => controller.deleteTask(task.id));
        }

        this.updateTaskCardState(taskCard, task);

        return taskCard;
    },

    renderList(tasks, template, listRoot, controller, emptyStateElement = null) {
        const safeTasks = Array.isArray(tasks) ? tasks : [];
        const isEmpty = safeTasks.length === 0;

        this.renderEmptyState(listRoot, emptyStateElement, isEmpty);

        if (isEmpty || !listRoot || !template) {
            return;
        }

        const fragment = document.createDocumentFragment();
        safeTasks.forEach((task) => {
            const taskNode = this.renderTaskItem(task, template, controller);
            if (taskNode) {
                fragment.appendChild(taskNode);
            }
        });

        listRoot.replaceChildren(fragment);
    }
};
