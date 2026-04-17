import { defineSectionContract } from '../shared/contracts/define-section-contract.js';

export const exampleSection = defineSectionContract({
    id: 'exampleSection',
    title: 'قسم جديد',
    init({ app }) {
        app.safeInit('section:example:init', () => {
            // bootstrap feature state or first render
        });
    },
    enter({ app }) {
        app.safeInit('section:example:enter', () => {
            // refresh visible UI when the section becomes active
        });
    },
    refresh({ app }) {
        app.safeInit('section:example:refresh', () => {
            // optional re-entry refresh logic
        });
    },
    leave({ app }) {
        app.safeInit('section:example:leave', () => {
            // optional cleanup when navigating away
        });
    }
});
