import { initializeApp } from './js/nodes.js';

const LAST_EDITED_STORAGE_KEY = 'amplistack:lastEditedAt';

const formatTimestamp = (timestamp) => {
    if (!timestamp) {
        return '--';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

const setupLastEdited = () => {
    const titleEl = document.getElementById('diagram-title');
    const lastEditedEl = document.getElementById('diagram-last-edited');

    if (!titleEl || !lastEditedEl) {
        return;
    }

    const savedTimestamp = localStorage.getItem(LAST_EDITED_STORAGE_KEY);
    lastEditedEl.textContent = `Last edited: ${formatTimestamp(savedTimestamp)}`;

    const updateLastEdited = () => {
        const now = new Date().toISOString();
        localStorage.setItem(LAST_EDITED_STORAGE_KEY, now);
        lastEditedEl.textContent = `Last edited: ${formatTimestamp(now)}`;
    };

    titleEl.addEventListener('input', updateLastEdited);
    titleEl.addEventListener('blur', updateLastEdited);
};

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupLastEdited();
});
