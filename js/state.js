// Shared mutable state for the diagram

export const DEFAULT_DIAGRAM_TITLE = 'Untitled Diagram';
export let diagramTitle = DEFAULT_DIAGRAM_TITLE;
export let lastEditedAt = null;
export function setDiagramTitle(title) {
    const trimmed = (title || '').trim();
    diagramTitle = trimmed || DEFAULT_DIAGRAM_TITLE;
}
export function getDiagramTitle() {
    return diagramTitle;
}
export function setLastEditedAt(timestamp) {
    lastEditedAt = timestamp || null;
}
export function getLastEditedAt() {
    return lastEditedAt;
}

export const addedItems = {
    marketing: new Set(),
    experiences: new Set(),
    sources: new Set(),
    analysis: new Set(),
    activation: new Set()
};

export const customEntries = {
    marketing: [],
    experiences: [],
    sources: [],
    analysis: [],
    activation: []
};

let customEntryCounter = 0;
export function getNextCustomEntryId(category) {
    customEntryCounter += 1;
    return `custom-${category}-${customEntryCounter}`;
}

export function resetCustomEntryCounter(nextValue = 0) {
    customEntryCounter = Math.max(0, nextValue);
}

export let activeCategory = 'marketing';
export function setActiveCategory(category) {
    activeCategory = category;
}

export let activeModel = null;
export function setActiveModel(modelId) {
    activeModel = modelId;
}

export const layerOrder = {
    marketing: [],
    experiences: [],
    sources: [],
    analysis: [],
    activation: []
};

export const dismissedConnections = new Set();
export const customConnections = new Set();
export const amplitudeSdkSelectedBadges = new Set();
export const dottedConnections = new Set();
export const connectionAnnotations = {};
export const nodeNotes = {};
