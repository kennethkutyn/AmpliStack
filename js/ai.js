import { addItemToLayer, clearDiagram, ensureItemAdded } from './nodes.js';
import { customEntries, addedItems } from './state.js';
import { itemCategoryIndex } from './config.js';
import { customConnections, dismissedConnections } from './state.js';
import { buildCustomConnectionKey, renderConnections } from './connections.js';
import { persistDiagramState } from './persistence.js';

// Point the client to the deployed proxy by default; allow override via global if needed.
const API_BASE_URL = window.AMPLISTACK_API_BASE_URL || 'https://amplistack-production.up.railway.app';
const TRANSCRIPT_ENDPOINT = '/api/ai/transcript';
const VALID_LAYERS = new Set(['marketing', 'experiences', 'sources', 'analysis', 'activation']);

// Known vendor fallbacks when the AI omits a layer. Extend as needed.
const AI_NODE_DEFAULTS = {
    clevertap: { layer: 'activation' },
    looker: { layer: 'analysis', icon: 'bi' }
};

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

function ensureCategoryContainers(category) {
    if (!category) return;
    if (!customEntries[category]) customEntries[category] = [];
    if (!addedItems[category]) addedItems[category] = new Set();
}

function isItemAlreadyAdded(itemId) {
    return Object.values(addedItems).some(set => set.has(itemId));
}

function guessLayerFromKind(kind) {
    const lower = (kind || '').toString().trim().toLowerCase();
    if (!lower) return null;
    if (lower === 'activation') return 'activation';
    if (lower === 'warehouse' || lower === 'analysis') return 'analysis';
    if (lower === 'amplitude') return 'analysis';
    if (lower === 'datasource' || lower === 'source') return 'sources';
    return null;
}

function upsertCustomEntry({ id, label, layer, kind, icon = 'custom' }) {
    const safeId = id || slugify(label);
    const name = label || safeId;

    const existingCategory = itemCategoryIndex[safeId];
    const normalizedLayer = normalizeLayer(layer);
    const kindLayer = guessLayerFromKind(kind);
    const defaultLayer = AI_NODE_DEFAULTS[safeId]?.layer;
    // Prefer the catalog category if it exists; otherwise use AI layer, kind hint, then defaults.
    const category = existingCategory || normalizedLayer || kindLayer || defaultLayer;
    const resolvedIcon = AI_NODE_DEFAULTS[safeId]?.icon || icon;

    if (!category) return null;
    ensureCategoryContainers(category);

    // If this is a known, pre-defined item (e.g., amplitude-sdk, s3), just add it.
    if (existingCategory) {
        ensureItemAdded(safeId);
        return safeId;
    }

    const existsInCustom = customEntries[category].some(entry => entry.id === safeId);
    if (!existsInCustom) {
        customEntries[category].push({
            id: safeId,
            name,
            icon: resolvedIcon,
            isCustom: true
        });
    }
    itemCategoryIndex[safeId] = category;

    if (!addedItems[category].has(safeId)) {
        addItemToLayer(safeId, name, resolvedIcon, category);
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
            kind: node?.kind,
            icon: 'custom'
        });
        if (id) {
            createdIds.add(id);
        }
    });

    // Safety net: if any node failed to add (missing category resolution, etc.), try once more with a fallback.
    nodes.forEach(node => {
        const nodeId = node?.id;
        if (!nodeId || isItemAlreadyAdded(nodeId)) return;
        const normalizedLayer = normalizeLayer(node?.layer);
        const kindLayer = guessLayerFromKind(node?.kind);
        const defaultLayer = AI_NODE_DEFAULTS[nodeId]?.layer || AI_NODE_DEFAULTS[slugify(node?.label)]?.layer;
        const category = itemCategoryIndex[nodeId] || normalizedLayer || kindLayer || defaultLayer || 'analysis';
        ensureCategoryContainers(category);
        const existsInCustom = customEntries[category].some(entry => entry.id === nodeId);
        if (!existsInCustom) {
            customEntries[category].push({
                id: nodeId,
                name: node?.label || nodeId,
                icon: AI_NODE_DEFAULTS[nodeId]?.icon || 'custom',
                isCustom: true
            });
        }
        itemCategoryIndex[nodeId] = category;
        if (!addedItems[category].has(nodeId)) {
            addItemToLayer(nodeId, node?.label || nodeId, AI_NODE_DEFAULTS[nodeId]?.icon || 'custom', category);
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

