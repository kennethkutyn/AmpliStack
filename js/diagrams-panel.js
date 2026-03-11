import { isLoggedIn, onAuthChange } from './auth.js';
import { trackOpenDiagram } from './analytics.js';
import { listDiagrams, duplicateDiagram, deleteDiagram } from './api.js';
import { getCurrentShortCode } from './persistence.js';

let panelOpen = false;
let diagrams = [];

export function initDiagramsPanel() {
    const btn = document.getElementById('my-diagrams-btn');
    const panel = document.getElementById('diagrams-panel');
    const closeBtn = document.getElementById('diagrams-panel-close');

    if (btn) btn.addEventListener('click', togglePanel);
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    // Close panel when clicking overlay
    panel?.addEventListener('click', (e) => {
        if (e.target === panel) closePanel();
    });

    onAuthChange(() => {
        if (!isLoggedIn()) closePanel();
    });
}

function togglePanel() {
    panelOpen ? closePanel() : openPanel();
}

async function openPanel() {
    const panel = document.getElementById('diagrams-panel');
    if (!panel || !isLoggedIn()) return;
    panelOpen = true;
    panel.classList.add('open');
    await refreshDiagramsList();
}

function closePanel() {
    const panel = document.getElementById('diagrams-panel');
    if (!panel) return;
    panelOpen = false;
    panel.classList.remove('open');
}

async function refreshDiagramsList() {
    const list = document.getElementById('diagrams-list');
    if (!list) return;

    list.innerHTML = '<div class="diagrams-loading">Loading...</div>';

    try {
        const data = await listDiagrams();
        diagrams = data.diagrams || [];
        renderDiagramsList(list);
    } catch (err) {
        list.innerHTML = '<div class="diagrams-empty">Failed to load diagrams.</div>';
    }
}

function renderDiagramsList(list) {
    if (diagrams.length === 0) {
        list.innerHTML = '<div class="diagrams-empty">No diagrams yet. Save your first diagram to see it here.</div>';
        return;
    }

    const currentCode = getCurrentShortCode();

    list.innerHTML = diagrams.map(d => {
        const isCurrent = d.short_code === currentCode;
        const isOwner = d.role === 'owner';
        const date = new Date(d.updated_at || d.created_at).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const time = new Date(d.updated_at || d.created_at).toLocaleTimeString(undefined, {
            hour: 'numeric', minute: '2-digit'
        });

        return `
            <div class="diagram-card ${isCurrent ? 'active' : ''}" data-code="${d.short_code}">
                <div class="diagram-card-header">
                    <span class="diagram-card-title">${escapeHtml(d.title || 'Untitled Diagram')}</span>
                    ${isOwner ? '<span class="diagram-card-badge owner">Owner</span>' : '<span class="diagram-card-badge viewer">Shared</span>'}
                </div>
                <div class="diagram-card-meta">${date} at ${time}</div>
                <div class="diagram-card-actions">
                    <button class="diagram-card-btn open-btn" data-code="${d.short_code}" title="Open">Open</button>
                    <button class="diagram-card-btn duplicate-btn" data-code="${d.short_code}" title="Duplicate a copy">Duplicate</button>
                    ${isOwner ? `<button class="diagram-card-btn delete-btn" data-code="${d.short_code}" title="Delete diagram">Delete</button>` : ''}
                </div>
            </div>`;
    }).join('');

    list.querySelectorAll('.open-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const code = btn.dataset.code;
            const card = btn.closest('.diagram-card');
            const title = card?.querySelector('.diagram-card-title')?.textContent || 'Untitled Diagram';
            trackOpenDiagram(title);
            window.location.href = `${window.location.pathname}?d=${code}`;
        });
    });

    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const code = btn.dataset.code;
            const confirmed = await showConfirmDialog(
                'Delete diagram?',
                'This diagram will be permanently deleted. This cannot be undone.'
            );
            if (!confirmed) return;
            try {
                btn.disabled = true;
                btn.textContent = 'Deleting...';
                await deleteDiagram(code);
                await refreshDiagramsList();
            } catch (err) {
                showConfirmDialog('Delete failed', 'Could not delete this diagram. Please try again.', true);
                btn.disabled = false;
                btn.textContent = 'Delete';
            }
        });
    });

    list.querySelectorAll('.duplicate-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const code = btn.dataset.code;
            try {
                btn.disabled = true;
                btn.textContent = 'Duplicating...';
                const result = await duplicateDiagram(code);
                window.location.href = `${window.location.pathname}?d=${result.short_code}`;
            } catch (err) {
                alert('Failed to duplicate diagram');
                btn.disabled = false;
                btn.textContent = 'Duplicate';
            }
        });
    });
}

function showConfirmDialog(title, message, infoOnly = false) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirm-dialog');
        const titleEl = document.getElementById('confirm-dialog-title');
        const messageEl = document.getElementById('confirm-dialog-message');
        const cancelBtn = document.getElementById('confirm-dialog-cancel');
        const confirmBtn = document.getElementById('confirm-dialog-confirm');
        if (!dialog) { resolve(!infoOnly && confirm(message)); return; }

        titleEl.textContent = title;
        messageEl.textContent = message;

        if (infoOnly) {
            cancelBtn.style.display = 'none';
            confirmBtn.textContent = 'OK';
            confirmBtn.className = 'confirm-dialog__btn confirm-dialog__btn--cancel';
        } else {
            cancelBtn.style.display = '';
            confirmBtn.textContent = 'Delete';
            confirmBtn.className = 'confirm-dialog__btn confirm-dialog__btn--confirm';
        }

        dialog.hidden = false;

        function cleanup(result) {
            dialog.hidden = true;
            cancelBtn.removeEventListener('click', onCancel);
            confirmBtn.removeEventListener('click', onConfirm);
            resolve(result);
        }
        function onCancel() { cleanup(false); }
        function onConfirm() { cleanup(true); }

        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
