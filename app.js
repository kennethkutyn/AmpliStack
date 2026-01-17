import { initializeApp } from './js/nodes.js';
import {
    DEFAULT_DIAGRAM_TITLE,
    getLastEditedAt,
    setDiagramTitle,
    setLastEditedAt
} from './js/state.js';
import { persistDiagramState } from './js/persistence.js';

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

    const storedTimestamp = getLastEditedAt() || localStorage.getItem(LAST_EDITED_STORAGE_KEY);
    setLastEditedAt(storedTimestamp || null);
    if (storedTimestamp) {
        localStorage.setItem(LAST_EDITED_STORAGE_KEY, storedTimestamp);
    }
    lastEditedEl.textContent = `Last edited: ${formatTimestamp(getLastEditedAt())}`;
    const initialTitle = (titleEl.textContent || '').trim() || DEFAULT_DIAGRAM_TITLE;
    setDiagramTitle(initialTitle);

    const updateLastEdited = () => {
        const now = new Date().toISOString();
        setLastEditedAt(now);
        localStorage.setItem(LAST_EDITED_STORAGE_KEY, now);
        lastEditedEl.textContent = `Last edited: ${formatTimestamp(now)}`;
    };

    const handleTitleChange = (event) => {
        const rawTitle = titleEl.textContent || '';
        const trimmed = rawTitle.trim();
        const normalizedTitle = trimmed || DEFAULT_DIAGRAM_TITLE;
        setDiagramTitle(normalizedTitle);
        if (!trimmed && event?.type === 'blur') {
            titleEl.textContent = normalizedTitle;
        }
        updateLastEdited();
        void persistDiagramState();
    };

    titleEl.addEventListener('input', handleTitleChange);
    titleEl.addEventListener('blur', handleTitleChange);
};

document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        await initializeApp();
        setupLastEdited();
    })();
});
