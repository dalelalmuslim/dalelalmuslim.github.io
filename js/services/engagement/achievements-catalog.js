export const ACHIEVEMENT_DEFINITIONS = Object.freeze([
    {
        id: 'tasbeeh_33',
        title: 'بداية الذكر',
        desc: 'قمت بـ 33 تسبيحة',
        icon: 'fa-seedling',
        check: state => (state.totalTasbeeh || 0) >= 33
    },
    {
        id: 'tasbeeh_100',
        title: 'ذاكر نشيط',
        desc: 'قمت بـ 100 تسبيحة',
        icon: 'fa-star',
        check: state => (state.totalTasbeeh || 0) >= 100
    },
    {
        id: 'tasbeeh_500',
        title: 'ذاكر قوي',
        desc: 'قمت بـ 500 تسبيحة',
        icon: 'fa-fire',
        check: state => (state.totalTasbeeh || 0) >= 500
    },
    {
        id: 'task_1',
        title: 'أول مهمة',
        desc: 'أنجزت أول مهمة',
        icon: 'fa-check',
        check: state => (state.tasksCompleted || 0) >= 1
    },
    {
        id: 'task_10',
        title: 'منظم',
        desc: 'أنجزت 10 مهام',
        icon: 'fa-list-check',
        check: state => (state.tasksCompleted || 0) >= 10
    },
    {
        id: 'streak_3',
        title: '3 أيام التزام',
        desc: 'حافظت على 3 أيام متتالية',
        icon: 'fa-calendar',
        check: state => (state.streakCount || 0) >= 3
    },
    {
        id: 'streak_7',
        title: 'أسبوع التزام',
        desc: 'حافظت على 7 أيام متتالية',
        icon: 'fa-medal',
        check: state => (state.streakCount || 0) >= 7
    }
]);
