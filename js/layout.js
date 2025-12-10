import {
    DROP_ZONE_HORIZONTAL_PADDING,
    DROP_ZONE_VERTICAL_PADDING,
    SLOT_COLUMNS,
    leftMostPriorityMap
} from './config.js';
import { layerOrder } from './state.js';

export function ensureLayerSlots(category) {
    if (!layerOrder[category]) {
        layerOrder[category] = [];
    }
    return layerOrder[category];
}

export function assignNodeSlot(category, itemId) {
    const slots = ensureLayerSlots(category);
    let index = slots.indexOf(itemId);
    if (index !== -1) return index;
    index = slots.indexOf(null);
    if (index === -1) {
        index = slots.length;
    }
    slots[index] = itemId;
    return index;
}

export function setNodeSlotPosition(node, slotIndex) {
    node.dataset.slotIndex = slotIndex;
    const column = (slotIndex % SLOT_COLUMNS) + 1;
    const row = Math.floor(slotIndex / SLOT_COLUMNS) + 1;
    node.style.gridColumn = `${column} / span 1`;
    node.style.gridRow = `${row} / span 1`;
}

export function getLayerCategoryFromContent(content) {
    return content?.parentElement?.dataset?.layer || content?.dataset?.layer || content?.closest('.layer')?.dataset?.layer || null;
}

export function getLayerElementFromTarget(target) {
    if (!target) return null;
    if (target.classList?.contains('layer')) return target;
    if (target.classList?.contains('layer-content')) {
        return target.closest('.layer');
    }
    return target.closest?.('.layer') || null;
}

export function getLayerContentFromTarget(target) {
    if (!target) return null;
    if (target.classList?.contains('layer-content')) return target;
    if (target.classList?.contains('layer')) {
        return target.querySelector('.layer-content');
    }
    const layer = target.closest?.('.layer');
    return layer?.querySelector('.layer-content') || null;
}

export function getSlotIndex(content, clientX, clientY) {
    if (!content) return 0;
    const rect = content.getBoundingClientRect();
    const safeWidth = Math.max(rect.width, 1);
    const safeHeight = Math.max(rect.height, 1);

    const clampedX = Math.min(
        Math.max(clientX, rect.left - DROP_ZONE_HORIZONTAL_PADDING),
        rect.right + DROP_ZONE_HORIZONTAL_PADDING
    );
    const clampedY = Math.min(
        Math.max(clientY, rect.top - DROP_ZONE_VERTICAL_PADDING),
        rect.bottom + DROP_ZONE_VERTICAL_PADDING
    );

    const relativeX = Math.min(Math.max(clampedX - rect.left, 0), safeWidth - 1);
    const relativeY = Math.min(Math.max(clampedY - rect.top, 0), safeHeight - 1);

    const slotWidth = safeWidth / SLOT_COLUMNS;
    const column = Math.min(SLOT_COLUMNS - 1, Math.max(0, Math.floor(relativeX / slotWidth)));

    const nodes = content.querySelectorAll('.diagram-node');
    let maxSlotIndex = -1;
    nodes.forEach(node => {
        const slot = Number(node.dataset?.slotIndex);
        if (!Number.isNaN(slot)) {
            maxSlotIndex = Math.max(maxSlotIndex, slot);
        }
    });
    const rowCount = Math.max(1, maxSlotIndex >= 0 ? Math.floor(maxSlotIndex / SLOT_COLUMNS) + 1 : 1);
    const rowHeight = Math.max(safeHeight / rowCount, 1);
    const row = Math.min(rowCount - 1, Math.max(0, Math.floor(relativeY / rowHeight)));

    return row * SLOT_COLUMNS + column;
}

export function updateLayerOrderForNode(category, nodeId, slotIndex) {
    const slots = ensureLayerSlots(category);
    const normalizedSlot = Math.max(0, slotIndex);
    while (slots.length <= normalizedSlot) slots.push(null);
    const currentIndex = slots.indexOf(nodeId);
    const displaced = slots[normalizedSlot];
    if (currentIndex !== -1) slots[currentIndex] = displaced ?? null;
    slots[normalizedSlot] = nodeId;
    if (currentIndex === -1 && displaced) {
        const empty = slots.indexOf(null);
        if (empty !== -1) {
            slots[empty] = displaced;
        } else {
            slots.push(displaced);
        }
    }
}

export function enforceNodeOrdering(priorityMap = leftMostPriorityMap) {
    const contents = document.querySelectorAll('.layer-content');
    contents.forEach(content => {
        const category = getLayerCategoryFromContent(content);
        if (!category) return;
        const nodes = Array.from(content.querySelectorAll('.diagram-node'));
        if (!nodes.length) return;
        const slots = ensureLayerSlots(category);
        const remaining = new Set(nodes.map(node => node.dataset.id));
        const orderedNodes = [];
        slots.forEach((id, slotIndex) => {
            if (!id) return;
            const node = content.querySelector(`.diagram-node[data-id="${id}"]`);
            if (node) {
                setNodeSlotPosition(node, slotIndex);
                orderedNodes.push(node);
                remaining.delete(id);
            }
        });
        remaining.forEach(id => {
            const node = content.querySelector(`.diagram-node[data-id="${id}"]`);
            if (node) {
                const slotIndex = assignNodeSlot(category, id);
                setNodeSlotPosition(node, slotIndex);
                orderedNodes.push(node);
            }
        });
        orderedNodes.sort((a, b) => {
            const slotA = Number(a.dataset.slotIndex) || 0;
            const slotB = Number(b.dataset.slotIndex) || 0;
            const priorityDiff = (priorityMap[a.dataset.id] ?? 100) - (priorityMap[b.dataset.id] ?? 100);
            if (priorityDiff !== 0) return priorityDiff;
            return slotA - slotB;
        });
        orderedNodes.forEach(node => content.appendChild(node));
    });
}
