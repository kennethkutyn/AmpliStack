import { applyDiagramTitleToDom, initializeApp, clearDiagram } from './js/nodes.js';
import {
    DEFAULT_DIAGRAM_TITLE,
    getLastEditedAt,
    setDiagramTitle,
    setLastEditedAt
} from './js/state.js';
import { persistDiagramState, saveToDatabase, getCurrentShortCode, loadFromDatabase } from './js/persistence.js';
import { initAiButton } from './js/ai.js';
import { restoreSession, onAuthChange, isLoggedIn, renderAuthUI, initGoogleSignIn } from './js/auth.js';
import { initDiagramsPanel } from './js/diagrams-panel.js';
import { trackSaveDiagram } from './js/analytics.js';

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
    applyDiagramTitleToDom(initialTitle);

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
        applyDiagramTitleToDom(normalizedTitle, { updateElement: false });
        if (!trimmed && event?.type === 'blur') {
            titleEl.textContent = normalizedTitle;
        }
        updateLastEdited();
        void persistDiagramState();
    };

    titleEl.addEventListener('input', handleTitleChange);
    titleEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            titleEl.blur();
        }
    });
    titleEl.addEventListener('blur', handleTitleChange);
};

function setupSaveButton() {
    const saveBtn = document.getElementById('save-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        if (!isLoggedIn()) return;
        try {
            saveBtn.disabled = true;
            saveBtn.querySelector('span').textContent = 'Saving...';
            await saveToDatabase();
            trackSaveDiagram(document.getElementById('diagram-title')?.textContent?.trim() || 'Untitled Diagram');
            saveBtn.querySelector('span').textContent = 'Saved!';
            setTimeout(() => {
                saveBtn.querySelector('span').textContent = getCurrentShortCode() ? 'Save' : 'Save';
                saveBtn.disabled = false;
            }, 1500);
        } catch (err) {
            console.error('Save failed:', err);
            saveBtn.querySelector('span').textContent = 'Save Failed';
            setTimeout(() => {
                saveBtn.querySelector('span').textContent = getCurrentShortCode() ? 'Save' : 'Save';
                saveBtn.disabled = false;
            }, 2000);
        }
    });
}

function showAuthRequiredBanner() {
    if (document.getElementById('auth-required-banner')) return;

    // Clear the canvas so they don't see stale/local data
    clearDiagram();

    const banner = document.createElement('div');
    banner.id = 'auth-required-banner';
    banner.className = 'auth-required-banner';

    const msg = document.createElement('span');
    msg.textContent = 'Sign in with your @amplitude.com account to view this shared diagram.';

    const loginBtn = document.createElement('div');
    loginBtn.id = 'banner-google-signin';
    initGoogleSignIn(loginBtn);

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'auth-banner-btn auth-banner-dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => {
        hideAuthRequiredBanner();
        // Clear the ?d= param so they get a fresh canvas
        const url = new URL(window.location.href);
        url.searchParams.delete('d');
        window.history.replaceState(null, '', url.toString());
        delete window._pendingShortCode;
    });

    banner.append(msg, loginBtn, dismissBtn);
    document.body.prepend(banner);
}

function hideAuthRequiredBanner() {
    document.getElementById('auth-required-banner')?.remove();
}

function initMenuDropdown() {
    const btn = document.getElementById('menu-btn');
    const dropdown = document.getElementById('menu-dropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== btn) {
            dropdown.classList.remove('open');
        }
    });

    // Close after clicking a menu item (except auth area)
    dropdown.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        // Restore auth session before app init (so we can load DB diagrams)
        restoreSession();
        renderAuthUI();

        initMenuDropdown();
        initAiButton();
        await initializeApp();
        setupLastEdited();
        setupSaveButton();
        initDiagramsPanel();

        // Show banner if trying to view a shared diagram without login
        if (window._pendingShortCode && !isLoggedIn()) {
            showAuthRequiredBanner();
        }

        // Handle post-login loading of pending short code diagrams
        onAuthChange(async (user) => {
            renderAuthUI();
            hideAuthRequiredBanner();
            // Close menu dropdown on login/logout
            document.getElementById('menu-dropdown')?.classList.remove('open');
            if (user && window._pendingShortCode) {
                const shortCode = window._pendingShortCode;
                delete window._pendingShortCode;
                // Restore ?d= in the URL and reload so the app picks it up
                const url = new URL(window.location.href);
                url.searchParams.set('d', shortCode);
                window.location.href = url.toString();
            }
        });
    })();
});
