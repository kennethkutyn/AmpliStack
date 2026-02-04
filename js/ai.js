import { addItemToLayer, clearDiagram } from './nodes.js';
import { customEntries, addedItems } from './state.js';
import { itemCategoryIndex } from './config.js';
import { customConnections, dismissedConnections } from './state.js';
import { buildCustomConnectionKey, renderConnections } from './connections.js';
import { persistDiagramState } from './persistence.js';

// Point the client to the deployed proxy by default; allow override via global if needed.
const API_BASE_URL = window.AMPLISTACK_API_BASE_URL || 'https://amplistack-production.up.railway.app';
const TRANSCRIPT_ENDPOINT = '/api/ai/transcript';
const VALID_LAYERS = new Set(['marketing', 'experiences', 'sources', 'analysis', 'activation']);

function setButtonState(button, { disabled, label, text }) {
    button.disabled = disabled;
    if (label) {
        button.setAttribute('aria-label', label);
    }
    if (text) {
        const span = button.querySelector('span');
        if (span) {
            span.textContent = text;
        }
    }
}

async function readClipboardText() {
    if (!navigator.clipboard?.readText) {
        throw new Error('Clipboard access is not available in this browser.');
    }
    const text = await navigator.clipboard.readText();
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('Clipboard is empty.');
    }
    return trimmed;
}

async function sendTranscript(transcript) {
    const response = await fetch(`${API_BASE_URL}${TRANSCRIPT_ENDPOINT}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            transcript,
            source: 'clipboard'
        })
    });

    if (!response.ok) {
        const message = await response.text().catch(() => 'Request failed');
        throw new Error(`AI request failed (${response.status}): ${message}`);
    }

    return response.json();
}

function slugify(value) {
    return (value || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'node';
}

function normalizeLayer(layer) {
    const lower = (layer || '').toString().trim().toLowerCase();
    return VALID_LAYERS.has(lower) ? lower : null;
}

function upsertCustomEntry({ id, label, layer, icon = 'custom' }) {
    const category = normalizeLayer(layer);
    if (!category) return null;
    const safeId = id || slugify(label);
    const name = label || safeId;

    const existingCategory = itemCategoryIndex[safeId];
    if (existingCategory && existingCategory !== category) {
        return null;
    }

    const existsInCustom = customEntries[category].some(entry => entry.id === safeId);
    if (!existsInCustom) {
        customEntries[category].push({
            id: safeId,
            name,
            icon,
            isCustom: true
        });
    }
    itemCategoryIndex[safeId] = category;

    if (!addedItems[category].has(safeId)) {
        addItemToLayer(safeId, name, icon, category);
    }

    return safeId;
}

function applyDiagramFromAi(result) {
    if (!result || typeof result !== 'object') return;
    const payload = result.data || result;
    const nodes = Array.isArray(payload.diagramNodes) ? payload.diagramNodes : [];
    const edges = Array.isArray(payload.diagramEdges) ? payload.diagramEdges : [];

    const createdIds = new Set();
    nodes.forEach(node => {
        const id = upsertCustomEntry({
            id: node?.id,
            label: node?.label || node?.name,
            layer: node?.layer,
            icon: 'custom'
        });
        if (id) {
            createdIds.add(id);
        }
    });

    edges.forEach(edge => {
        const sourceId = edge?.sourceId;
        const targetId = edge?.targetId;
        if (!sourceId || !targetId) return;
        if (createdIds.size) {
            // Ensure connections only if nodes exist or already present.
            const sourceKnown = itemCategoryIndex[sourceId];
            const targetKnown = itemCategoryIndex[targetId];
            if (!sourceKnown || !targetKnown) return;
        }
        const key = buildCustomConnectionKey(sourceId, targetId);
        customConnections.add(key);
        dismissedConnections.delete(key);
    });

    renderConnections();
    void persistDiagramState();
}

export function initAiButton() {
    const aiButton = document.getElementById('ai-btn');
    const dialog = document.getElementById('ai-dialog');
    const input = document.getElementById('ai-input');
    const submitBtn = document.getElementById('ai-submit-btn');
    const cancelBtn = document.getElementById('ai-cancel-btn');
    const loadingEl = document.getElementById('ai-loading');

    if (!aiButton || !dialog || !input || !submitBtn || !cancelBtn || !loadingEl) return;

    const idleLabel = aiButton.getAttribute('aria-label') || 'AI assist';
    const idleText = aiButton.querySelector('span')?.textContent || 'AI';
    let isOpen = false;
    let isLoading = false;

    const setDialogLoading = (loading) => {
        isLoading = loading;
        dialog.classList.toggle('ai-dialog--loading', loading);
        loadingEl.hidden = !loading; // keep hidden attr for safety; CSS also controls display
        input.disabled = loading;
        cancelBtn.disabled = loading;
        submitBtn.disabled = loading;
        if (loading) {
            setButtonState(submitBtn, { disabled: true, label: 'Submitting…', text: 'Submitting…' });
        } else {
            setButtonState(submitBtn, { disabled: false, label: 'Submit', text: 'Submit' });
        }
    };

    const openDialog = () => {
        dialog.hidden = false;
        dialog.classList.add('ai-dialog--visible');
        isOpen = true;
        setDialogLoading(false);
        input.value = '';
        input.focus();
    };

    // Ensure clean state on init
    setDialogLoading(false);

    const closeDialog = () => {
        dialog.hidden = true;
        dialog.classList.remove('ai-dialog--visible');
        isOpen = false;
    };

    aiButton.addEventListener('click', async () => {
        if (aiButton.disabled || isOpen) return;
        openDialog();
    });

    cancelBtn.addEventListener('click', () => {
        if (isLoading) return;
        closeDialog();
    });

    submitBtn.addEventListener('click', async () => {
        if (isLoading) return;
        const transcript = (input.value || '').trim();
        if (!transcript) {
            window.alert('Please enter a description or transcript.');
            return;
        }

        try {
            setDialogLoading(true);
            const result = await sendTranscript(transcript);
            clearDiagram();
            applyDiagramFromAi(result);
            console.info('AI transcript response', result);
            closeDialog();
        } catch (error) {
            console.error('AI assist failed', error);
            window.alert(error?.message || 'AI assist failed. Check console for details.');
        } finally {
            setDialogLoading(false);
        }
    });
}

