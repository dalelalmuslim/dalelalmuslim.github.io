const TASKS_DOM_IDS = Object.freeze({
    input: 'newTaskInput',
    template: 'tpl-task-card',
    listRoot: 'tasksList',
    emptyState: 'tasksEmptyState'
});

function getElementById(id) {
    return typeof id === 'string' && id
        ? document.getElementById(id)
        : null;
}

export function getTasksDomElement(key) {
    return getElementById(TASKS_DOM_IDS[key]);
}

export function getTasksRenderContext() {
    return {
        template: getTasksDomElement('template'),
        listRoot: getTasksDomElement('listRoot'),
        emptyState: getTasksDomElement('emptyState')
    };
}
