import {
    SLOT_COLUMNS,
    amplitudeSdkBadgeOptions,
    categories,
    icons,
    itemCategoryIndex,
    modelAutoConfig
} from './config.js';
import {
    activeCategory,
    activeModel,
    addedItems,
    amplitudeSdkSelectedBadges,
    DEFAULT_DIAGRAM_TITLE,
    diagramTitle,
    customConnections,
    customEntries,
    dismissedConnections,
    connectionAnnotations,
    dottedConnections,
    nodeNotes,
    getNextCustomEntryId,
    resetCustomEntryCounter,
    layerOrder,
    setActiveCategory,
    setActiveModel,
    setDiagramTitle,
    setLastEditedAt
} from './state.js';
import {
    assignNodeSlot,
    enforceNodeOrdering,
    ensureLayerSlots,
    getLayerCategoryFromContent,
    getLayerContentFromTarget,
    getLayerElementFromTarget,
    getSlotIndex,
    setNodeSlotPosition,
    updateLayerOrderForNode
} from './layout.js';
import {
    buildCustomConnectionKey,
    parseCustomConnectionKey,
    renderConnections
} from './connections.js';
import { trackAppLaunched, trackExportButtonClick, trackNodeAdded } from './analytics.js';
import {
    clearPersistedDiagramState,
    loadDiagramState,
    persistDiagramState
} from './persistence.js';

let pendingConnectionNode = null;
let draggedNode = null;
let slotGuidesVisible = false;
let activeNoteNode = null;
let activeNoteNodeId = null;
let noteEditor = null;

export function initCategoryPicker() {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            switchCategory(category);
        });
    });
}

export function initModelPicker() {
    const modelButtons = document.querySelectorAll('.model-option');
    modelButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modelId = button.dataset.model;
            if (!modelId) return;
            const wasActive = modelId === activeModel;
            if (!wasActive) {
                setActiveModel(modelId);
                updateModelPickerState();
                renderConnections();
                void persistDiagramState();
            }
            applyModelAutoAdjustments(modelId);
        });
    });
    updateModelPickerState();
}

export function initLayerDragTargets() {
    document.querySelectorAll('.layer').forEach(layer => {
        layer.addEventListener('dragover', handleLayerDragOver);
        layer.addEventListener('dragleave', handleLayerDragLeave);
        layer.addEventListener('drop', handleLayerDrop);
    });
}

export function initCustomEntryInput() {
    const input = document.getElementById('custom-entry-input');
    const addBtn = document.getElementById('add-custom-btn');
    if (!input || !addBtn) return;
    addBtn.addEventListener('click', () => {
        addCustomEntry();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addCustomEntry();
        }
    });
}

export async function initExportButton() {
    const exportBtn = document.getElementById('export-btn');
    if (!exportBtn) return;
    const idleAriaLabel = exportBtn.getAttribute('aria-label') || 'Export diagram';
    exportBtn.addEventListener('click', async () => {
        trackExportButtonClick();
        try {
            const exportContainer = document.querySelector('.canvas-container');
            if (!exportContainer) return;
            await loadHtml2Canvas();
            exportBtn.disabled = true;
            exportBtn.setAttribute('aria-label', 'Exporting diagram');
            exportContainer.classList.add('is-exporting');
            const options = {
                backgroundColor: '#FFFFFF',
                scale: Math.max(window.devicePixelRatio || 1, 2),
                scrollX: 0,
                scrollY: 0,
                useCORS: true,
                width: exportContainer.scrollWidth,
                height: exportContainer.scrollHeight,
                windowWidth: exportContainer.scrollWidth,
                windowHeight: exportContainer.scrollHeight
            };

            const canvas = await window.html2canvas(exportContainer, options);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) return;
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `amplistack-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed', error);
        } finally {
            const exportContainer = document.querySelector('.canvas-container');
            if (exportContainer) {
                exportContainer.classList.remove('is-exporting');
            }
            exportBtn.disabled = false;
            exportBtn.setAttribute('aria-label', idleAriaLabel);
        }
    });
}

export function switchCategory(category) {
    if (!category || category === activeCategory) return;
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });
    setActiveCategory(category);
    renderComponentList(category);
}

export function renderComponentList(category) {
    const list = document.getElementById('component-list');
    const categoryData = categories[category];

    if (!list || !categoryData) return;
    list.innerHTML = '';
    list.dataset.category = category;

    categoryData.items.forEach(item => {
        const li = createComponentListItem(item, category, false);
        list.appendChild(li);
    });

    customEntries[category].forEach(item => {
        const li = createComponentListItem(item, category, true);
        list.appendChild(li);
    });
}

export function updateModelPickerState() {
    const modelButtons = document.querySelectorAll('.model-option');
    modelButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.model === activeModel);
    });
}

function updateCategoryTabState() {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === activeCategory);
    });
}

function createComponentListItem(item, category, isCustom) {
    const li = document.createElement('li');
    li.className = 'component-item';
    li.dataset.id = item.id;
    li.dataset.category = category;

    if (isCustom) {
        li.classList.add('custom-entry');
    }

    if (addedItems[category].has(item.id)) {
        li.classList.add('added');
    }

    const iconHtml = isCustom ? icons['custom'] : (icons[item.icon] || icons['amplitude']);

    li.innerHTML = `
        <div class="component-icon category-${category}">
            ${iconHtml}
        </div>
        <span class="component-name">${item.name}</span>
    `;

    li.addEventListener('click', () => {
        addItemToLayer(item.id, item.name, isCustom ? 'custom' : item.icon, category);
    });

    return li;
}

export function addCustomEntry() {
    const input = document.getElementById('custom-entry-input');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    const id = getNextCustomEntryId(activeCategory);
    const entry = {
        id,
        name,
        icon: 'custom',
        isCustom: true
    };

    customEntries[activeCategory].push(entry);
    itemCategoryIndex[id] = activeCategory;
    input.value = '';
    renderComponentList(activeCategory);

    const list = document.getElementById('component-list');
    if (list) {
        list.scrollTop = list.scrollHeight;
    }
    void persistDiagramState();
}

export function addItemToLayer(itemId, itemName, iconKey, category) {
    if (addedItems[category].has(itemId)) {
        const existingNode = document.querySelector(`.layer[data-layer="${category}"] .diagram-node[data-id="${itemId}"]`);
        if (existingNode) {
            existingNode.classList.add('highlight');
            setTimeout(() => existingNode.classList.remove('highlight'), 600);
        }
        return;
    }

    const layer = document.querySelector(`.layer[data-layer="${category}"]`);
    const layerContent = layer?.querySelector('.layer-content');
    if (!layerContent) return;

    const node = createDiagramNode(itemId, itemName, iconKey, category);

    node.classList.add('entering');
    const slotIndex = assignNodeSlot(category, itemId);
    setNodeSlotPosition(node, slotIndex);
    layerContent.appendChild(node);
    enforceNodeOrdering();

    node.offsetHeight;
    node.classList.remove('entering');

    addedItems[category].add(itemId);
    updateSidebarItemState(itemId, category, true);
    renderConnections();
    trackNodeAdded(itemName);
    void persistDiagramState();
}

export function ensureItemAdded(itemId) {
    const definition = getItemDefinition(itemId);
    if (!definition) return;
    const { id, name, icon, category } = definition;
    if (addedItems[category]?.has(id)) return;
    addItemToLayer(id, name, icon, category);
}

export function removeItemById(itemId) {
    const node = document.querySelector(`.diagram-node[data-id="${itemId}"]`);
    if (!node) return;
    const category = node.dataset.category || itemCategoryIndex[itemId];
    if (!category) return;
    removeItemFromLayer(itemId, category, node);
}

export function applyModelAutoAdjustments(modelId) {
    const config = modelAutoConfig[modelId];
    if (!config) return;
    (config.add || []).forEach(ensureItemAdded);
    (config.remove || []).forEach(removeItemById);
}

function getItemDefinition(itemId) {
    if (!itemId) return null;
    const category = itemCategoryIndex[itemId];
    if (!category) return null;
    const categoryData = categories[category];
    let item = categoryData?.items?.find(entry => entry.id === itemId);
    if (!item) {
        item = customEntries[category]?.find(entry => entry.id === itemId);
    }
    if (!item) return null;
    return { ...item, category };
}

function createDiagramNode(itemId, itemName, iconKey, category) {
    const node = document.createElement('div');
    node.className = `diagram-node node-${category}`;
    node.dataset.id = itemId;
    node.dataset.category = category;
    node.setAttribute('draggable', 'true');

    const iconHtml = icons[iconKey] || icons['amplitude'];

    node.innerHTML = `
        <div class="node-icon category-${category}">${iconHtml}</div>
        <span class="node-label">${itemName}</span>
        <button class="node-remove" title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
        <button class="node-note" title="Add note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="12" height="16" rx="2" ry="2"/>
                <line x1="9" y1="10" x2="15" y2="10"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
        </button>
        <button class="node-connect" title="Draw connection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
        </button>
    `;

    if (itemId === 'amplitude-sdk') {
        attachAmplitudeSdkBadges(node);
    }

    const removeBtn = node.querySelector('.node-remove');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pendingConnectionNode === node) {
            clearPendingConnection();
        }
        removeItemFromLayer(itemId, category, node);
    });

    const connectBtn = node.querySelector('.node-connect');
    connectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startConnectionFromNode(node);
    });

    const noteBtn = node.querySelector('.node-note');
    noteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openNodeNoteEditor(node, noteBtn);
    });

    node.addEventListener('click', () => {
        handleNodeClick(node);
    });

    node.addEventListener('dragstart', handleDragStart);
    node.addEventListener('dragend', handleDragEnd);

    const existingNote = nodeNotes[itemId];
    if (typeof existingNote === 'string' && existingNote.trim()) {
        node.classList.add('has-note');
    }

    return node;
}

function ensureNoteEditor() {
    if (noteEditor) return noteEditor;
    const textarea = document.createElement('textarea');
    textarea.rows = 4;
    textarea.wrap = 'soft';
    textarea.className = 'node-note-editor';
    textarea.placeholder = 'Add note';
    textarea.addEventListener('click', (event) => event.stopPropagation());
    textarea.addEventListener('input', handleNoteInput);
    textarea.addEventListener('keydown', handleNoteKeydown);
    textarea.addEventListener('blur', handleNoteBlur);
    document.body.appendChild(textarea);
    noteEditor = textarea;
    return noteEditor;
}

function openNodeNoteEditor(node, anchor) {
    closeNodeNoteEditor();
    if (!node || !anchor) return;
    const editor = ensureNoteEditor();
    activeNoteNode = node;
    activeNoteNodeId = node.dataset?.id || null;
    const existing = (activeNoteNodeId && nodeNotes[activeNoteNodeId]) || '';
    editor.value = existing;
    positionNodeNoteEditor(anchor);
    editor.classList.add('visible');
    editor.focus();
    editor.setSelectionRange(existing.length, existing.length);
}

function closeNodeNoteEditor() {
    if (!noteEditor) return;
    noteEditor.classList.remove('visible');
    activeNoteNode = null;
    activeNoteNodeId = null;
}

function positionNodeNoteEditor(anchor) {
    if (!noteEditor || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const offset = 8;
    noteEditor.style.left = `${rect.right + offset}px`;
    noteEditor.style.top = `${rect.top}px`;
}

function handleNoteInput(event) {
    if (!activeNoteNode) return;
    if (!activeNoteNodeId) {
        activeNoteNodeId = activeNoteNode.dataset?.id || null;
    }
    if (!activeNoteNodeId) return;
    const value = event.target.value || '';
    const trimmed = value.trim();
    if (trimmed) {
        nodeNotes[activeNoteNodeId] = value;
        activeNoteNode.classList.add('has-note');
    } else {
        delete nodeNotes[activeNoteNodeId];
        activeNoteNode.classList.remove('has-note');
    }
}

function handleNoteKeydown(event) {
    if (event.key === 'Escape') {
        event.preventDefault();
        noteEditor?.blur();
    }
}

function handleNoteBlur() {
    if (activeNoteNode && noteEditor) {
        if (!activeNoteNodeId) {
            activeNoteNodeId = activeNoteNode.dataset?.id || null;
        }
        if (activeNoteNodeId) {
            const value = noteEditor.value || '';
            const trimmed = value.trim();
            if (trimmed) {
                nodeNotes[activeNoteNodeId] = value;
                activeNoteNode.classList.add('has-note');
            } else {
                delete nodeNotes[activeNoteNodeId];
                activeNoteNode.classList.remove('has-note');
            }
            void persistDiagramState();
        }
    }
    closeNodeNoteEditor();
}

function attachAmplitudeSdkBadges(node) {
    const badgesWrapper = document.createElement('div');
    badgesWrapper.className = 'node-badges';

    amplitudeSdkBadgeOptions.forEach(({ id, label }) => {
        const badgeButton = document.createElement('button');
        badgeButton.type = 'button';
        badgeButton.className = 'node-badge';
        badgeButton.dataset.badgeId = id;
        badgeButton.textContent = label;
        badgeButton.setAttribute('aria-label', `${label} badge`);
        badgeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleAmplitudeSdkBadge(node, id);
        });
        badgesWrapper.appendChild(badgeButton);
    });

    node.appendChild(badgesWrapper);
    syncAmplitudeSdkBadgeState(node);
}

function toggleAmplitudeSdkBadge(node, badgeId) {
    if (amplitudeSdkSelectedBadges.has(badgeId)) {
        amplitudeSdkSelectedBadges.delete(badgeId);
    } else {
        amplitudeSdkSelectedBadges.add(badgeId);
    }
    syncAmplitudeSdkBadgeState(node);
    void persistDiagramState();
}

function syncAmplitudeSdkBadgeState(node) {
    const hasActiveBadges = amplitudeSdkSelectedBadges.size > 0;
    node.classList.toggle('has-active-badges', hasActiveBadges);
    node.querySelectorAll('.node-badge').forEach(badge => {
        const badgeId = badge.dataset.badgeId;
        const isActive = amplitudeSdkSelectedBadges.has(badgeId);
        badge.classList.toggle('active', isActive);
        badge.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function removeItemFromLayer(itemId, category, node) {
    node.classList.add('removing');

    node.addEventListener('animationend', () => {
        node.remove();
        addedItems[category].delete(itemId);
        const slots = ensureLayerSlots(category);
        const index = slots.indexOf(itemId);
        if (index !== -1) {
            slots[index] = null;
        }
        delete nodeNotes[itemId];
        updateSidebarItemState(itemId, category, false);
        removeRelatedCustomConnections(itemId);
        enforceNodeOrdering();
        renderConnections();
        void persistDiagramState();
    });
}

function updateSidebarItemState(itemId, category, isAdded) {
    if (category !== activeCategory) return;

    const sidebarItem = document.querySelector(`.component-item[data-id="${itemId}"][data-category="${category}"]`);
    if (sidebarItem) {
        sidebarItem.classList.toggle('added', isAdded);
    }
}

function startConnectionFromNode(node) {
    if (pendingConnectionNode === node) {
        clearPendingConnection();
        return;
    }
    clearPendingConnection();
    pendingConnectionNode = node;
    node.classList.add('pending-connection');
}

function handleNodeClick(node) {
    if (draggedNode) return;
    if (!pendingConnectionNode) return;
    if (pendingConnectionNode === node) {
        clearPendingConnection();
        return;
    }
    addCustomConnection(pendingConnectionNode.dataset.id, node.dataset.id);
    clearPendingConnection();
}

function clearPendingConnection() {
    if (pendingConnectionNode) {
        pendingConnectionNode.classList.remove('pending-connection');
        pendingConnectionNode = null;
    }
}

function addCustomConnection(sourceId, targetId) {
    if (!sourceId || !targetId) return;
    const key = buildCustomConnectionKey(sourceId, targetId);
    customConnections.add(key);
    dismissedConnections.delete(key);
    renderConnections();
    void persistDiagramState();
}

function removeRelatedCustomConnections(nodeId) {
    const toDelete = [];
    customConnections.forEach(key => {
        const { sourceId, targetId } = parseCustomConnectionKey(key);
        if (sourceId === nodeId || targetId === nodeId) {
            toDelete.push(key);
        }
    });
    toDelete.forEach(key => {
        customConnections.delete(key);
        dismissedConnections.delete(key);
    });
}

function showSlotGuides(targetContent = null) {
    if (slotGuidesVisible) return;
    const contents = targetContent ? [targetContent] : Array.from(document.querySelectorAll('.layer-content'));
    if (!contents.length) return;
    slotGuidesVisible = true;
    contents.forEach(content => {
        refreshSlotGuideLayer(content);
        content.classList.add('slot-guides-visible');
    });
}

function hideSlotGuides() {
    if (!slotGuidesVisible) return;
    slotGuidesVisible = false;
    document.querySelectorAll('.layer-content.slot-guides-visible').forEach(content => {
        content.classList.remove('slot-guides-visible');
    });
}

function refreshSlotGuideLayer(content) {
    const guideLayer = ensureSlotGuideLayer(content);
    const rowsToShow = getSlotGuideRowCount(content);
    const totalSlots = rowsToShow * SLOT_COLUMNS;
    const currentSlots = guideLayer.children.length;
    if (currentSlots > totalSlots) {
        while (guideLayer.children.length > totalSlots) {
            guideLayer.removeChild(guideLayer.lastChild);
        }
    } else if (currentSlots < totalSlots) {
        for (let i = currentSlots; i < totalSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot-guide-ghost';
            guideLayer.appendChild(slot);
        }
    }
}

function ensureSlotGuideLayer(content) {
    let guideLayer = content.querySelector('.slot-guide-layer');
    if (!guideLayer) {
        guideLayer = document.createElement('div');
        guideLayer.className = 'slot-guide-layer';
        guideLayer.setAttribute('aria-hidden', 'true');
        content.appendChild(guideLayer);
    }
    return guideLayer;
}

function getSlotGuideRowCount(content) {
    const nodes = Array.from(content.querySelectorAll('.diagram-node'));
    let highestSlotIndex = -1;
    nodes.forEach(node => {
        const slotIndex = Number(node.dataset?.slotIndex);
        if (!Number.isNaN(slotIndex)) {
            highestSlotIndex = Math.max(highestSlotIndex, slotIndex);
        }
    });
    const category = getLayerCategoryFromContent(content);
    if (category) {
        const slots = ensureLayerSlots(category);
        slots.forEach((id, index) => {
            if (id) {
                highestSlotIndex = Math.max(highestSlotIndex, index);
            }
        });
    }
    const rowsFromHighestIndex = highestSlotIndex >= 0 ? Math.floor(highestSlotIndex / SLOT_COLUMNS) + 1 : 0;
    const rowsFromNodeCount = nodes.length ? Math.ceil(nodes.length / SLOT_COLUMNS) : 0;
    return Math.max(1, rowsFromHighestIndex, rowsFromNodeCount);
}

function handleDragStart(e) {
    draggedNode = e.currentTarget;
    if (!draggedNode) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedNode.dataset.id);
    requestAnimationFrame(() => draggedNode.classList.add('dragging'));
    const sourceContent = getLayerContentFromTarget(draggedNode);
    showSlotGuides(sourceContent);
}

function handleDragEnd() {
    hideSlotGuides();
    if (draggedNode) {
        draggedNode.classList.remove('dragging');
        draggedNode = null;
    }
    document.querySelectorAll('.layer-content.drag-over').forEach(content => content.classList.remove('drag-over'));
}

function handleLayerDragOver(e) {
    if (!draggedNode) return;
    const layer = getLayerElementFromTarget(e.currentTarget);
    const content = getLayerContentFromTarget(layer || e.currentTarget);
    if (!content) return;
    const targetCategory = getLayerCategoryFromContent(content);
    if (targetCategory !== draggedNode.dataset.category) return;
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
    content.classList.add('drag-over');
}

function handleLayerDragLeave(e) {
    if (!draggedNode) return;
    const layer = getLayerElementFromTarget(e.currentTarget);
    if (layer?.contains(e.relatedTarget)) return;
    const content = getLayerContentFromTarget(layer || e.currentTarget);
    if (content) {
        content.classList.remove('drag-over');
    }
}

function handleLayerDrop(e) {
    if (!draggedNode) return;
    const layer = getLayerElementFromTarget(e.currentTarget);
    const content = getLayerContentFromTarget(layer || e.currentTarget);
    if (!content) return;
    const targetCategory = getLayerCategoryFromContent(content);
    if (targetCategory !== draggedNode.dataset.category) return;
    e.preventDefault();
    const slotIndex = getSlotIndex(content, e.clientX, e.clientY);
    updateLayerOrderForNode(targetCategory, draggedNode.dataset.id, slotIndex);
    setNodeSlotPosition(draggedNode, slotIndex);
    content.classList.remove('drag-over');
    enforceNodeOrdering();
    renderConnections();
    void persistDiagramState();
    handleDragEnd();
}

function loadHtml2Canvas() {
    if (window.html2canvas) {
        return Promise.resolve(window.html2canvas);
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.async = true;
        script.onload = () => resolve(window.html2canvas);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export async function initializeApp() {
    if (document?.documentElement) {
        document.documentElement.style.setProperty('--slot-columns', String(SLOT_COLUMNS));
    }
    trackAppLaunched();
    initCategoryPicker();
    initCustomEntryInput();
    initModelPicker();
    initLayerDragTargets();
    initExportButton();
    initCopyLinkButton();
    initRefreshButton();
    const restored = await restoreDiagramStateFromStorage();
    if (!restored) {
        updateCategoryTabState();
        renderComponentList(activeCategory);
        renderConnections();
        applyDiagramTitleToDom(diagramTitle);
    }
    window.addEventListener('resize', () => renderConnections());
}

async function restoreDiagramStateFromStorage() {
    const stored = await loadDiagramState();
    if (!stored) return false;
    try {
        Object.values(addedItems).forEach(set => set.clear());
        Object.keys(layerOrder).forEach(category => {
            layerOrder[category] = [];
        });
        Object.keys(customEntries).forEach(category => {
            customEntries[category] = [];
        });
        customConnections.clear();
        dismissedConnections.clear();
        dottedConnections.clear();
        Object.keys(connectionAnnotations).forEach(key => delete connectionAnnotations[key]);
        Object.keys(nodeNotes).forEach(key => delete nodeNotes[key]);
        amplitudeSdkSelectedBadges.clear();
        clearCustomItemIndex();

        const storedTitle = stored.diagramTitle || DEFAULT_DIAGRAM_TITLE;
        setDiagramTitle(storedTitle);
        applyDiagramTitleToDom(storedTitle);
        setLastEditedAt(stored.lastEditedAt || null);

        if (Array.isArray(stored.amplitudeSdkSelectedBadges)) {
            stored.amplitudeSdkSelectedBadges.forEach(id => amplitudeSdkSelectedBadges.add(id));
        }

        let maxCustomId = 0;
        if (stored.customEntries) {
            Object.entries(stored.customEntries).forEach(([category, entries]) => {
                if (!customEntries[category]) {
                    customEntries[category] = [];
                }
                entries.forEach(entry => {
                    customEntries[category].push({ ...entry });
                    itemCategoryIndex[entry.id] = category;
                    const match = /custom-[a-z-]+-(\d+)/.exec(entry.id);
                    if (match) {
                        const parsed = Number(match[1]);
                        if (Number.isFinite(parsed)) {
                            maxCustomId = Math.max(maxCustomId, parsed);
                        }
                    }
                });
            });
        }
        resetCustomEntryCounter(maxCustomId);

        if (stored.layerOrder) {
            Object.entries(stored.layerOrder).forEach(([category, slots]) => {
                layerOrder[category] = Array.isArray(slots) ? [...slots] : [];
            });
        }

        if (stored.activeModel) {
            setActiveModel(stored.activeModel);
        }
        if (stored.activeCategory) {
            setActiveCategory(stored.activeCategory);
        }

        if (stored.nodeNotes && typeof stored.nodeNotes === 'object') {
            Object.entries(stored.nodeNotes).forEach(([id, value]) => {
                if (typeof value === 'string' && value.trim()) {
                    nodeNotes[id] = value;
                }
            });
        }

        Object.keys(addedItems).forEach(category => {
            const slots = layerOrder[category] || [];
            slots.forEach(id => {
                if (id) ensureItemAdded(id);
            });
            const extraIds = new Set(stored.addedItems?.[category] || []);
            slots.forEach(id => extraIds.delete(id));
            extraIds.forEach(id => ensureItemAdded(id));
        });

        (stored.customConnections || []).forEach(key => customConnections.add(key));
        (stored.dismissedConnections || []).forEach(key => dismissedConnections.add(key));
        (stored.dottedConnections || []).forEach(key => dottedConnections.add(key));
        if (stored.connectionAnnotations && typeof stored.connectionAnnotations === 'object') {
            Object.entries(stored.connectionAnnotations).forEach(([key, value]) => {
                if (typeof value === 'string' && value.trim()) {
                    connectionAnnotations[key] = value;
                }
            });
        }

        updateCategoryTabState();
        updateModelPickerState();
        renderComponentList(activeCategory);
        renderConnections();
        return true;
    } catch (error) {
        console.error('Failed to restore diagram state', error);
        return false;
    }
}

function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (!refreshBtn) return;
    refreshBtn.addEventListener('click', () => {
        clearDiagram();
    });
}

function initCopyLinkButton() {
    const copyBtn = document.getElementById('copy-link-btn');
    if (!copyBtn) return;
    copyBtn.addEventListener('click', async () => {
        try {
            await persistDiagramState();
            const url = new URL(window.location.href);
            await navigator.clipboard.writeText(url.toString());
        } catch (error) {
            console.error('Failed to copy link', error);
        }
    });
}

function clearCustomItemIndex() {
    Object.keys(itemCategoryIndex).forEach(id => {
        if (id.startsWith('custom-')) {
            delete itemCategoryIndex[id];
        }
    });
}

function clearDiagram() {
    document.querySelectorAll('.diagram-node').forEach(node => node.remove());
    Object.keys(addedItems).forEach(category => addedItems[category].clear());
    Object.keys(layerOrder).forEach(category => {
        layerOrder[category] = [];
    });
    customConnections.clear();
    dismissedConnections.clear();
    dottedConnections.clear();
    Object.keys(connectionAnnotations).forEach(key => delete connectionAnnotations[key]);
    Object.keys(nodeNotes).forEach(key => delete nodeNotes[key]);
    amplitudeSdkSelectedBadges.clear();
    Object.keys(customEntries).forEach(category => {
        customEntries[category] = [];
    });
    resetCustomEntryCounter(0);
    clearCustomItemIndex();
    setActiveModel(null);
    setActiveCategory('marketing');
    setDiagramTitle(DEFAULT_DIAGRAM_TITLE);
    setLastEditedAt(null);
    applyDiagramTitleToDom(DEFAULT_DIAGRAM_TITLE);
    updateCategoryTabState();
    updateModelPickerState();
    renderComponentList(activeCategory);
    renderConnections();
    clearPersistedDiagramState();
}

function applyDiagramTitleToDom(title) {
    const el = document.getElementById('diagram-title');
    if (!el) return;
    el.textContent = title || DEFAULT_DIAGRAM_TITLE;
}
