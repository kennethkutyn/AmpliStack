// Shared mutable state for the diagram

import {
    categories,
    CUSTOM_LANE_PALETTES,
    DEFAULT_CUSTOM_LANE_NAME,
    DEFAULT_LAYER_SEQUENCE
} from './config.js';

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

export function getDefaultLayerName(category) {
    return categories[category]?.name || DEFAULT_CUSTOM_LANE_NAME;
}

export function isBuiltInLayer(category) {
    return Object.prototype.hasOwnProperty.call(categories, category);
}

export function getCustomLanePalette(paletteIndex = 0) {
    const index = Math.abs(Number(paletteIndex) || 0) % CUSTOM_LANE_PALETTES.length;
    return CUSTOM_LANE_PALETTES[index];
}

export const customLayers = [];
let customLayerCounter = 0;

export function getLayerSequence() {
    return [...DEFAULT_LAYER_SEQUENCE, ...customLayers.map(layer => layer.id)];
}

export function ensureLayerState(category, defaultName) {
    if (!category) return;
    if (!addedItems[category]) addedItems[category] = new Set();
    if (!customEntries[category]) customEntries[category] = [];
    if (!layerOrder[category]) layerOrder[category] = [];
    if (!Object.prototype.hasOwnProperty.call(layerNames, category)) {
        layerNames[category] = defaultName || getDefaultLayerName(category);
    }
}

export function registerCustomLayer({ id, name, paletteIndex } = {}) {
    const layerId = id || getNextCustomLayerId();
    const resolvedName = (name || '').trim() || DEFAULT_CUSTOM_LANE_NAME;
    const resolvedPalette = Number.isFinite(paletteIndex) ? paletteIndex : customLayers.length;
    const match = /^lane-(\d+)$/.exec(layerId);
    if (match) {
        customLayerCounter = Math.max(customLayerCounter, Number(match[1]));
    }
    if (customLayers.some(layer => layer.id === layerId)) {
        ensureLayerState(layerId, resolvedName);
        return customLayers.find(layer => layer.id === layerId);
    }
    const layer = { id: layerId, name: resolvedName, paletteIndex: resolvedPalette };
    customLayers.push(layer);
    ensureLayerState(layerId, resolvedName);
    layerNames[layerId] = resolvedName;
    return layer;
}

export function getNextCustomLayerId() {
    customLayerCounter += 1;
    return `lane-${customLayerCounter}`;
}

export function unregisterCustomLayer(category) {
    const index = customLayers.findIndex(layer => layer.id === category);
    if (index === -1) return;
    customLayers.splice(index, 1);
    delete addedItems[category];
    delete customEntries[category];
    delete layerOrder[category];
    delete layerNames[category];
}

export function resetCustomLayers() {
    [...customLayers.map(layer => layer.id)].forEach(unregisterCustomLayer);
    customLayerCounter = 0;
}

export const layerNames = Object.fromEntries(
    Object.keys(categories).map(key => [key, categories[key].name])
);

export function setLayerName(category, name) {
    if (!Object.prototype.hasOwnProperty.call(layerNames, category)) return;
    const trimmed = (name || '').trim();
    layerNames[category] = trimmed || getDefaultLayerName(category);
    const custom = customLayers.find(layer => layer.id === category);
    if (custom) custom.name = layerNames[category];
}

export function resetLayerNames() {
    Object.keys(categories).forEach(key => {
        layerNames[key] = categories[key].name;
    });
    customLayers.forEach(layer => {
        layerNames[layer.id] = layer.name || DEFAULT_CUSTOM_LANE_NAME;
    });
    Object.keys(layerNames).forEach(key => {
        if (!isBuiltInLayer(key) && !customLayers.some(layer => layer.id === key)) {
            delete layerNames[key];
        }
    });
}

export function applyStoredLayerNames(stored) {
    resetLayerNames();
    if (!stored || typeof stored !== 'object') return;
    Object.entries(stored).forEach(([category, name]) => {
        if (typeof name === 'string') {
            setLayerName(category, name);
        }
    });
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
