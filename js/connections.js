import {
    ADJACENCY_PADDING_X,
    ADJACENCY_PADDING_Y,
    AMP_ADJACENCY_SOURCE_ID,
    AMP_ADJACENCY_TARGET_IDS,
    BATCH_EVENT_LABEL_TEXT,
    CONNECTION_COLOR,
    EVENT_STREAM_LABEL_TEXT,
    HORIZONTAL_PROXIMITY_THRESHOLD,
    LAYER_SEQUENCE,
    MCP_LABEL_TEXT,
    MAX_COLUMN_DELTA_FOR_ADJACENCY,
    MAX_ROW_DELTA_FOR_ADJACENCY,
    PAID_ADS_LABEL_TEXT,
    SLOT_COLUMNS,
    SVG_NS,
    VERTICAL_PROXIMITY_THRESHOLD,
    batchEventTargetIds,
    connectionModels,
    globalConnectionRules
} from './config.js';
import { activeModel, customConnections, dismissedConnections } from './state.js';
import { ensureLayerSlots } from './layout.js';
import { persistDiagramState } from './persistence.js';

const connectionLabels = new Map(); // connectionKey -> Set<SVGTextElement>

export function buildConnectionKey(sourceNode, targetNode, tag = 'default') {
    const sourceId = sourceNode?.dataset?.id || sourceNode?.dataset?.category || 'unknown-source';
    const targetId = targetNode?.dataset?.id || targetNode?.dataset?.category || 'unknown-target';
    return `${sourceId}->${targetId}:${tag}`;
}

export function buildConnectionPairKey(sourceNode, targetNode) {
    const sourceId = sourceNode?.dataset?.id || sourceNode?.dataset?.category || 'unknown-source';
    const targetId = targetNode?.dataset?.id || targetNode?.dataset?.category || 'unknown-target';
    return `${sourceId}->${targetId}`;
}

export function buildCustomConnectionKey(sourceId, targetId) {
    return `custom:${sourceId}->${targetId}`;
}

export function parseCustomConnectionKey(key) {
    if (!key || !key.startsWith('custom:')) return {};
    const arrowIndex = key.indexOf('->');
    if (arrowIndex === -1) return {};
    const sourceId = key.substring(7, arrowIndex);
    const targetId = key.substring(arrowIndex + 2);
    return { sourceId, targetId };
}

export function renderConnections() {
    const canvas = document.querySelector('.canvas');
    if (!canvas) return;
    const model = activeModel ? connectionModels[activeModel] : null;

    const combinedRuleDescriptors = [
        ...globalConnectionRules.map((rule, idx) => ({ rule, tag: `global-${idx}` }))
    ];
    if (model?.rules?.length) {
        combinedRuleDescriptors.push(
            ...model.rules.map((rule, idx) => ({ rule, tag: `model-${activeModel}-${idx}` }))
        );
    }

    const highlightLayer = ensureAdjacencyHighlightLayer();
    const svg = ensureConnectionLayer();
    if (!svg) return;

    const suppressors = model?.suppress || [];
    const canvasRect = canvas.getBoundingClientRect();
    if (highlightLayer) {
        clearAdjacencyHighlights(highlightLayer);
    }

    svg.setAttribute('width', canvasRect.width);
    svg.setAttribute('height', canvasRect.height);
    svg.setAttribute('viewBox', `0 0 ${canvasRect.width} ${canvasRect.height}`);
    svg.innerHTML = '';
    connectionLabels.clear();
    const ruleConnectionPairs = new Set();

    svg.appendChild(createArrowMarker());

    const connections = [];
    let activationLabelCandidate = null;
    const connectedPairs = new Set();

    combinedRuleDescriptors.forEach(({ rule, tag }) => {
        const sources = resolveSelectorNodes(rule.from);
        const targets = resolveSelectorNodes(rule.to);

        sources.forEach(sourceNode => {
            targets.forEach(targetNode => {
                if (sourceNode === targetNode) return;
                if (shouldSuppressConnection(sourceNode, targetNode, suppressors)) return;
                if (shouldSkipConnection(rule, sourceNode, targetNode)) return;
                const pairKey = buildConnectionPairKey(sourceNode, targetNode);
                if (ruleConnectionPairs.has(pairKey)) return;
                ruleConnectionPairs.add(pairKey);
                const key = buildConnectionKey(sourceNode, targetNode, `rule-${tag}`);
                if (dismissedConnections.has(key)) return;
                const path = buildConnectorPath(sourceNode, targetNode, canvasRect);
                if (path) {
                    path.dataset.connectionKey = key;
                    path.dataset.sourceId = sourceNode.dataset?.id || '';
                    path.dataset.targetId = targetNode.dataset?.id || '';
                    svg.appendChild(path);
                    connections.push(path);
                    registerConnectedPair(connectedPairs, sourceNode.dataset?.id, targetNode.dataset?.id);
                    handleBatchEventsLabel(svg, path, sourceNode, targetNode, key);
                    handleMcpLabel(svg, path, sourceNode, targetNode, key);
                    activationLabelCandidate = updateActivationLabelCandidate(
                        activationLabelCandidate,
                        path,
                        sourceNode,
                        targetNode,
                        key
                    );
                }
            });
        });
    });

    customConnections.forEach(key => {
        if (dismissedConnections.has(key)) return;
        const { sourceId, targetId } = parseCustomConnectionKey(key);
        if (!sourceId || !targetId) return;
        const sourceNode = document.querySelector(`.diagram-node[data-id="${sourceId}"]`);
        const targetNode = document.querySelector(`.diagram-node[data-id="${targetId}"]`);
        if (!sourceNode || !targetNode) return;
        const path = buildConnectorPath(sourceNode, targetNode, canvasRect);
        if (path) {
            path.dataset.connectionKey = key;
            path.dataset.sourceId = sourceId;
            path.dataset.targetId = targetId;
            svg.appendChild(path);
            connections.push(path);
            registerConnectedPair(connectedPairs, sourceId, targetId);
            handleBatchEventsLabel(svg, path, sourceNode, targetNode, key);
            handleMcpLabel(svg, path, sourceNode, targetNode, key);
            activationLabelCandidate = updateActivationLabelCandidate(
                activationLabelCandidate,
                path,
                sourceNode,
                targetNode,
                key
            );
        }
    });

    const paidAdsPath = renderPaidAdsAdditionalConnection(svg, canvasRect);
    if (paidAdsPath) {
        connections.push(paidAdsPath);
    }

    applyActivationLabel(svg, activationLabelCandidate);
    updateAdjacencyHighlights(highlightLayer, canvasRect, connectedPairs);

    connections.forEach(path => {
        path.addEventListener('click', () => {
            const key = path.dataset.connectionKey;
            if (key) {
                dismissedConnections.add(key);
                removeConnectionLabel(key);
            }
            path.remove();
            void persistDiagramState();
        }, { once: true });
    });
}

function handleBatchEventsLabel(svg, path, sourceNode, targetNode, connectionKey) {
    if (!svg || !path || !connectionKey) return;
    if (!shouldLabelBatchEvents(sourceNode, targetNode)) return;
    const label = createConnectionLabel(svg, path, BATCH_EVENT_LABEL_TEXT, connectionKey);
    if (label) {
        registerConnectionLabel(connectionKey, label);
    }
}

function handleMcpLabel(svg, path, sourceNode, targetNode, connectionKey) {
    if (!svg || !path || !connectionKey) return;
    if (!shouldLabelMcpConnection(sourceNode, targetNode)) return;
    const label = createConnectionLabel(svg, path, MCP_LABEL_TEXT, connectionKey);
    if (label) {
        registerConnectionLabel(connectionKey, label);
    }
}

function updateActivationLabelCandidate(currentCandidate, path, sourceNode, targetNode, connectionKey) {
    if (!path || !connectionKey) return currentCandidate;
    if (!canLabelActivationConnection(sourceNode, targetNode)) return currentCandidate;
    const targetRect = targetNode?.getBoundingClientRect?.();
    if (!targetRect) return currentCandidate;
    const candidateX = targetRect.left;
    if (!currentCandidate || candidateX < currentCandidate.targetX) {
        return {
            path,
            connectionKey,
            targetX: candidateX
        };
    }
    return currentCandidate;
}

function applyActivationLabel(svg, candidate) {
    if (!svg || !candidate) return;
    const label = createConnectionLabel(svg, candidate.path, EVENT_STREAM_LABEL_TEXT, candidate.connectionKey);
    if (label) {
        registerConnectionLabel(candidate.connectionKey, label);
    }
}

function shouldLabelBatchEvents(sourceNode, targetNode) {
    const sourceId = sourceNode?.dataset?.id;
    const targetId = targetNode?.dataset?.id;
    if (!sourceId || !targetId) return false;
    const amplitudeId = 'amplitude-analytics';
    const amplitudeToWarehouse = sourceId === amplitudeId && batchEventTargetIds.has(targetId);
    const warehouseToAmplitude = batchEventTargetIds.has(sourceId) && targetId === amplitudeId;
    return amplitudeToWarehouse || warehouseToAmplitude;
}

function shouldLabelMcpConnection(sourceNode, targetNode) {
    const sourceId = sourceNode?.dataset?.id;
    const targetId = targetNode?.dataset?.id;
    if (!sourceId || !targetId) return false;
    const pair = new Set([sourceId, targetId]);
    return pair.has('llm') && pair.has('amplitude-analytics');
}

function canLabelActivationConnection(sourceNode, targetNode) {
    const sourceId = sourceNode?.dataset?.id;
    const targetCategory = targetNode?.dataset?.category;
    if (!sourceId || !targetCategory) return false;
    return sourceId === 'amplitude-analytics' && targetCategory === 'activation';
}

function createConnectionLabel(svg, path, labelText, connectionKey) {
    if (!svg || !path || !labelText) return null;
    if (typeof path.getTotalLength !== 'function') return null;
    let totalLength;
    try {
        totalLength = path.getTotalLength();
    } catch {
        return null;
    }
    if (!Number.isFinite(totalLength) || totalLength <= 0) return null;
    const midpoint = path.getPointAtLength(totalLength / 2);
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', midpoint.x);
    const lines = String(labelText).split('\n');
    const verticalOffset = (lines.length - 1) * 6;
    label.setAttribute('y', midpoint.y - 8 - verticalOffset / 2);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    label.classList.add('connection-label');
    label.setAttribute('pointer-events', 'none');
    if (connectionKey) {
        label.dataset.connectionKey = connectionKey;
    }
    if (lines.length === 1) {
        label.textContent = labelText;
    } else {
        lines.forEach((line, index) => {
            const tspan = document.createElementNS(SVG_NS, 'tspan');
            tspan.textContent = line;
            tspan.setAttribute('x', midpoint.x);
            tspan.setAttribute('dy', index === 0 ? 0 : '1.1em');
            label.appendChild(tspan);
        });
    }
    svg.appendChild(label);
    return label;
}

function registerConnectionLabel(connectionKey, label) {
    if (!connectionKey || !label) return;
    if (!connectionLabels.has(connectionKey)) {
        connectionLabels.set(connectionKey, new Set());
    }
    connectionLabels.get(connectionKey).add(label);
}

function removeConnectionLabel(connectionKey) {
    if (!connectionKey) return;
    const labels = connectionLabels.get(connectionKey);
    if (labels) {
        labels.forEach(label => label.remove());
        connectionLabels.delete(connectionKey);
    }
}

function addPaidAdsLabel(svg, path) {
    if (!svg || !path) return;
    const label = createConnectionLabel(svg, path, PAID_ADS_LABEL_TEXT, 'paid-ads-direct');
    if (label) {
        registerConnectionLabel('paid-ads-direct', label);
    }
}

function ensureConnectionLayer() {
    const canvas = document.querySelector('.canvas');
    if (!canvas) return null;
    let svg = document.getElementById('connection-layer');
    if (!svg) {
        svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('id', 'connection-layer');
        svg.classList.add('connection-layer');
        canvas.appendChild(svg);
    }
    return svg;
}

function ensureAdjacencyHighlightLayer() {
    const canvas = document.querySelector('.canvas');
    if (!canvas) return null;
    let layer = document.getElementById('adjacency-highlight-layer');
    const firstChild = canvas.firstChild;
    if (!layer) {
        layer = document.createElement('div');
        layer.setAttribute('id', 'adjacency-highlight-layer');
        layer.classList.add('adjacency-highlight-layer');
        if (firstChild) {
            canvas.insertBefore(layer, firstChild);
        } else {
            canvas.appendChild(layer);
        }
    } else if (firstChild && layer !== firstChild) {
        canvas.insertBefore(layer, firstChild);
    }
    return layer;
}

function clearAdjacencyHighlights(layer) {
    if (!layer) return;
    layer.innerHTML = '';
}

function registerConnectedPair(pairSet, sourceId, targetId) {
    if (!pairSet || !sourceId || !targetId) return;
    pairSet.add(`${sourceId}->${targetId}`);
    pairSet.add(`${targetId}->${sourceId}`);
}

function areNodesConnected(pairSet, sourceId, targetId) {
    if (!pairSet || !sourceId || !targetId) return false;
    return pairSet.has(`${sourceId}->${targetId}`);
}

function areNodesVisuallyAdjacent(nodeA, nodeB) {
    const layerA = nodeA?.dataset?.category;
    const layerB = nodeB?.dataset?.category;
    if (!layerA || !layerB) return false;
    if (layerA === layerB) {
        return areRowsClose(nodeA, nodeB) && areColumnsClose(nodeA, nodeB);
    }
    const indexA = LAYER_SEQUENCE.indexOf(layerA);
    const indexB = LAYER_SEQUENCE.indexOf(layerB);
    if (indexA === -1 || indexB === -1) return false;
    return Math.abs(indexA - indexB) === 1 && areColumnsClose(nodeA, nodeB);
}

function getNodeColumnIndex(node) {
    if (!node) return null;
    const slotIndex = Number(node.dataset?.slotIndex);
    if (Number.isNaN(slotIndex)) return null;
    return slotIndex % SLOT_COLUMNS;
}

function getNodeRowIndex(node) {
    if (!node) return null;
    const slotIndex = Number(node.dataset?.slotIndex);
    if (Number.isNaN(slotIndex)) return null;
    return Math.floor(slotIndex / SLOT_COLUMNS);
}

function areColumnsClose(nodeA, nodeB) {
    const columnA = getNodeColumnIndex(nodeA);
    const columnB = getNodeColumnIndex(nodeB);
    if (columnA === null || columnB === null) {
        return areNodesHorizontallyClose(nodeA, nodeB);
    }
    return Math.abs(columnA - columnB) <= MAX_COLUMN_DELTA_FOR_ADJACENCY;
}

function areRowsClose(nodeA, nodeB) {
    const rowA = getNodeRowIndex(nodeA);
    const rowB = getNodeRowIndex(nodeB);
    if (rowA === null || rowB === null) {
        return areNodesVerticallyClose(nodeA, nodeB);
    }
    return Math.abs(rowA - rowB) <= MAX_ROW_DELTA_FOR_ADJACENCY;
}

function areNodesHorizontallyClose(nodeA, nodeB) {
    const rectA = nodeA?.getBoundingClientRect?.();
    const rectB = nodeB?.getBoundingClientRect?.();
    if (!rectA || !rectB) return false;
    const centerA = rectA.left + rectA.width / 2;
    const centerB = rectB.left + rectB.width / 2;
    return Math.abs(centerA - centerB) <= HORIZONTAL_PROXIMITY_THRESHOLD;
}

function areNodesVerticallyClose(nodeA, nodeB) {
    const rectA = nodeA?.getBoundingClientRect?.();
    const rectB = nodeB?.getBoundingClientRect?.();
    if (!rectA || !rectB) return false;
    const centerA = rectA.top + rectA.height / 2;
    const centerB = rectB.top + rectB.height / 2;
    return Math.abs(centerA - centerB) <= VERTICAL_PROXIMITY_THRESHOLD;
}

function createAdjacencyHighlight(nodeA, nodeB, canvasRect) {
    if (!nodeA || !nodeB || !canvasRect) return null;
    const rectA = nodeA.getBoundingClientRect();
    const rectB = nodeB.getBoundingClientRect();
    if (!rectA || !rectB) return null;
    const rawLeft = Math.min(rectA.left, rectB.left) - canvasRect.left - ADJACENCY_PADDING_X;
    const rawTop = Math.min(rectA.top, rectB.top) - canvasRect.top - ADJACENCY_PADDING_Y;
    const rawRight = Math.max(rectA.right, rectB.right) - canvasRect.left + ADJACENCY_PADDING_X;
    const rawBottom = Math.max(rectA.bottom, rectB.bottom) - canvasRect.top + ADJACENCY_PADDING_Y;

    const left = Math.max(0, rawLeft);
    const top = Math.max(0, rawTop);
    const right = Math.min(canvasRect.width, rawRight);
    const bottom = Math.min(canvasRect.height, rawBottom);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    if (width <= 0 || height <= 0) return null;

    const highlight = document.createElement('div');
    highlight.classList.add('adjacency-highlight');
    highlight.style.left = `${left}px`;
    highlight.style.top = `${top}px`;
    highlight.style.width = `${width}px`;
    highlight.style.height = `${height}px`;
    return highlight;
}

function updateAdjacencyHighlights(layer, canvasRect, connectedPairs) {
    if (!layer || !canvasRect) return;
    layer.innerHTML = '';
    const anchorNode = document.querySelector(`.diagram-node[data-id="${AMP_ADJACENCY_SOURCE_ID}"]`);
    if (!anchorNode) return;
    const anchorId = anchorNode.dataset?.id;
    if (!anchorId) return;

    AMP_ADJACENCY_TARGET_IDS.forEach(targetId => {
        const targetNode = document.querySelector(`.diagram-node[data-id="${targetId}"]`);
        if (!targetNode) return;
        if (!areNodesConnected(connectedPairs, anchorId, targetId)) return;
        if (!areNodesVisuallyAdjacent(anchorNode, targetNode)) return;
        const highlight = createAdjacencyHighlight(anchorNode, targetNode, canvasRect);
        if (highlight) {
            layer.appendChild(highlight);
        }
    });
}

function createArrowMarker() {
    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', 'connection-arrow');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerWidth', '6.4');
    marker.setAttribute('markerHeight', '6.4');
    marker.setAttribute('refX', '4.8');
    marker.setAttribute('refY', '2.4');
    marker.setAttribute('markerUnits', 'strokeWidth');

    const arrowPath = document.createElementNS(SVG_NS, 'path');
    arrowPath.setAttribute('d', 'M0,0 L4.8,2.4 L0,4.8 Z');
    arrowPath.setAttribute('fill', CONNECTION_COLOR);
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    return defs;
}

function resolveSelectorNodes(selector = {}) {
    let nodes = Array.from(document.querySelectorAll('.diagram-node'));
    if (selector.category) {
        nodes = nodes.filter(node => node.dataset.category === selector.category);
    }
    if (selector.ids) {
        nodes = nodes.filter(node => selector.ids.includes(node.dataset.id));
    }
    return nodes;
}

function nodeMatchesSelector(node, selector = {}) {
    if (!node) return false;
    if (!selector || (!selector.category && !selector.ids?.length)) {
        return true;
    }
    if (selector.category && node.dataset.category !== selector.category) {
        return false;
    }
    if (selector.ids && selector.ids.length && !selector.ids.includes(node.dataset.id)) {
        return false;
    }
    return true;
}

function shouldSuppressConnection(sourceNode, targetNode, suppressors = []) {
    if (!suppressors.length) return false;
    return suppressors.some(condition => {
        const fromMatch = !condition.from || nodeMatchesSelector(sourceNode, condition.from);
        const toMatch = !condition.to || nodeMatchesSelector(targetNode, condition.to);
        return fromMatch && toMatch;
    });
}

function shouldSkipConnection(rule, sourceNode, targetNode) {
    if (!rule?.exclusions?.length) return false;
    return rule.exclusions.some(exclusion => {
        const sourceIdMatch = matchesExclusionList(exclusion.sourceIds, sourceNode.dataset.id);
        const sourceCategoryMatch = matchesExclusionList(exclusion.sourceCategories, sourceNode.dataset.category);
        const targetIdMatch = matchesExclusionList(exclusion.targetIds, targetNode.dataset.id);
        const targetCategoryMatch = matchesExclusionList(exclusion.targetCategories, targetNode.dataset.category);
        return sourceIdMatch && sourceCategoryMatch && targetIdMatch && targetCategoryMatch;
    });
}

function matchesExclusionList(list, value) {
    if (!Array.isArray(list) || !list.length) return true;
    return list.includes(value);
}

function renderPaidAdsAdditionalConnection(svg, canvasRect) {
    const paidAdsNode = document.querySelector('.diagram-node[data-id="paid-ads"]');
    const amplitudeAnalyticsNode = document.querySelector('.diagram-node[data-id="amplitude-analytics"]');
    if (!paidAdsNode || !amplitudeAnalyticsNode) return null;

    if (dismissedConnections.has('paid-ads-direct')) {
        return null;
    }

    const marketingLayer = document.querySelector('.layer[data-layer="marketing"]');
    const analysisLayer = document.querySelector('.layer[data-layer="analysis"]');
    if (!marketingLayer || !analysisLayer) return null;

    const paidRect = paidAdsNode.getBoundingClientRect();
    const amplitudeRect = amplitudeAnalyticsNode.getBoundingClientRect();
    const marketingRect = marketingLayer.getBoundingClientRect();

    const start = {
        x: paidRect.left - canvasRect.left,
        y: paidRect.top + paidRect.height / 2 - canvasRect.top
    };
    const leftBoundary = marketingRect.left - canvasRect.left - 32;
    const travelX = Math.max(24, leftBoundary);
    const end = {
        x: amplitudeRect.left - canvasRect.left,
        y: amplitudeRect.top + amplitudeRect.height / 2 - canvasRect.top
    };

    const points = [
        start,
        { x: travelX, y: start.y },
        { x: travelX, y: end.y },
        end
    ];

    const pathData = createRoundedPath(points, 17);
    if (!pathData) return null;

    const path = document.createElementNS(SVG_NS, 'path');
    path.dataset.connectionKey = 'paid-ads-direct';
    path.dataset.sourceId = paidAdsNode.dataset?.id || '';
    path.dataset.targetId = amplitudeAnalyticsNode.dataset?.id || '';
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', CONNECTION_COLOR);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('marker-end', 'url(#connection-arrow)');
    svg.appendChild(path);
    addPaidAdsLabel(svg, path);
    return path;
}

function buildActivationToMarketingPath(sourceNode, targetNode, canvasRect) {
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const activationLayerRect = getLayerRect(sourceNode);
    const marketingLayerRect = getLayerRect(targetNode);
    const start = {
        x: sourceRect.left + sourceRect.width / 2 - canvasRect.left,
        y: sourceRect.bottom - canvasRect.top
    };
    const targetTop = {
        x: targetRect.left + targetRect.width / 2 - canvasRect.left,
        y: targetRect.top - canvasRect.top
    };
    const layerRightBoundary = activationLayerRect
        ? activationLayerRect.right - canvasRect.left
        : sourceRect.right - canvasRect.left;
    const rightOffset = 32;
    const canvasEdgeMargin = 12;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const xMin = canvasEdgeMargin;
    const xMax = canvasRect.width - canvasEdgeMargin;
    const yMin = canvasEdgeMargin;
    const yMax = canvasRect.height - canvasEdgeMargin;
    const desiredRight = Math.max(start.x + rightOffset, layerRightBoundary + rightOffset);
    const canvasRight = Math.min(canvasRect.width - canvasEdgeMargin, desiredRight);
    const tierClearance = 32;
    const topClearance = 28;
    const topMargin = marketingLayerRect
        ? Math.max(12, marketingLayerRect.top - canvasRect.top - topClearance)
        : 32;
    const canvasBottomLimit = canvasRect.height - 24;
    const nodeClearanceY = Math.min(canvasBottomLimit, start.y + Math.max(18, sourceRect.height * 0.3));
    const extraHorizontalClearance = 0;
    let activationExitY;
    if (activationLayerRect) {
        const layerBottomY = activationLayerRect.bottom - canvasRect.top;
        activationExitY = Math.min(canvasBottomLimit, layerBottomY + tierClearance);
    } else {
        activationExitY = Math.min(canvasBottomLimit, nodeClearanceY + tierClearance);
    }
    activationExitY = Math.max(activationExitY, nodeClearanceY + 8);
    const horizontalTravelY = Math.min(canvasBottomLimit, activationExitY + extraHorizontalClearance);

    const points = [start];
    if (Math.abs(nodeClearanceY - start.y) > 0.5) {
        points.push({ x: start.x, y: nodeClearanceY });
    }
    if (Math.abs(horizontalTravelY - nodeClearanceY) > 0.5) {
        points.push({ x: start.x, y: horizontalTravelY });
    }
    points.push(
        { x: canvasRight, y: horizontalTravelY },
        { x: canvasRight, y: topMargin },
        { x: targetTop.x, y: topMargin },
        targetTop
    );

    const clampedPoints = points.map(point => ({
        x: clamp(point.x, xMin, xMax),
        y: clamp(point.y, yMin, yMax)
    }));

    const pathData = createRoundedPath(clampedPoints, 17);
    if (!pathData) return null;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', CONNECTION_COLOR);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('marker-end', 'url(#connection-arrow)');
    return path;
}

function buildConnectorPath(sourceNode, targetNode, canvasRect) {
    if (sourceNode?.dataset?.category === 'activation' && targetNode?.dataset?.category === 'marketing') {
        return buildActivationToMarketingPath(sourceNode, targetNode, canvasRect);
    }
    if (sourceNode?.dataset?.category === targetNode?.dataset?.category) {
        const sameTierPath = buildSameTierConnectorPath(sourceNode, targetNode, canvasRect);
        if (sameTierPath) return sameTierPath;
    }
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const points = calculateConnectorPoints(sourceNode, targetNode, sourceRect, targetRect, canvasRect);
    if (!points || points.length < 2) return null;

    const pathData = createRoundedPath(points, 17);
    if (!pathData) return null;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', CONNECTION_COLOR);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('marker-end', 'url(#connection-arrow)');
    return path;
}

function buildSameTierConnectorPath(sourceNode, targetNode, canvasRect) {
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const sourceSlot = Number(sourceNode.dataset.slotIndex) || 0;
    const targetSlot = Number(targetNode.dataset.slotIndex) || 0;
    const rowSource = Math.floor(sourceSlot / SLOT_COLUMNS);
    const rowTarget = Math.floor(targetSlot / SLOT_COLUMNS);
    if (rowSource !== rowTarget) return null;
    const start = {
        x: sourceRect.left + sourceRect.width / 2 - canvasRect.left,
        y: sourceRect.top - canvasRect.top
    };
    const end = {
        x: targetRect.left + targetRect.width / 2 - canvasRect.left,
        y: targetRect.top - canvasRect.top
    };
    const slots = ensureLayerSlots(sourceNode.dataset.category);
    const [minSlot, maxSlot] = [Math.min(sourceSlot, targetSlot), Math.max(sourceSlot, targetSlot)];
    const hasIntermediateNodes = slots.some((id, idx) => idx > minSlot && idx < maxSlot && id);

    let points;
    if (!hasIntermediateNodes) {
        const lateralStart = sourceSlot < targetSlot ? {
            x: sourceRect.right - canvasRect.left,
            y: sourceRect.top + sourceRect.height / 2 - canvasRect.top
        } : {
            x: sourceRect.left - canvasRect.left,
            y: sourceRect.top + sourceRect.height / 2 - canvasRect.top
        };
        const lateralEnd = sourceSlot < targetSlot ? {
            x: targetRect.left - canvasRect.left,
            y: targetRect.top + targetRect.height / 2 - canvasRect.top
        } : {
            x: targetRect.right - canvasRect.left,
            y: targetRect.top + targetRect.height / 2 - canvasRect.top
        };
        const midX = (lateralStart.x + lateralEnd.x) / 2;
        points = [
            lateralStart,
            { x: midX, y: lateralStart.y },
            { x: midX, y: lateralEnd.y },
            lateralEnd
        ];
    } else {
        const offsetY = Math.max(20, start.y - 20);
        points = [
            start,
            { x: start.x, y: offsetY },
            { x: end.x, y: offsetY },
            end
        ];
    }

    const pathData = createRoundedPath(points, 12);
    if (!pathData) return null;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', CONNECTION_COLOR);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('marker-end', 'url(#connection-arrow)');
    return path;
}

function calculateConnectorPoints(sourceNode, targetNode, sourceRect, targetRect, canvasRect) {
    if (!sourceRect || !targetRect) return null;
    const verticalGap = targetRect.top - sourceRect.bottom;
    const reverseVerticalGap = sourceRect.top - targetRect.bottom;
    const tolerance = 8;

    if (verticalGap > tolerance) {
        const start = {
            x: sourceRect.left + sourceRect.width / 2 - canvasRect.left,
            y: sourceRect.bottom - canvasRect.top
        };
        const end = {
            x: targetRect.left + targetRect.width / 2 - canvasRect.left,
            y: targetRect.top - canvasRect.top
        };
        const gapCenter = getLayerGapCenter(sourceNode, targetNode, canvasRect);
        const midY = gapCenter ?? (start.y + end.y) / 2;
        return [
            start,
            { x: start.x, y: midY },
            { x: end.x, y: midY },
            end
        ];
    }

    if (reverseVerticalGap > tolerance) {
        const start = {
            x: sourceRect.left + sourceRect.width / 2 - canvasRect.left,
            y: sourceRect.top - canvasRect.top
        };
        const end = {
            x: targetRect.left + targetRect.width / 2 - canvasRect.left,
            y: targetRect.bottom - canvasRect.top
        };
        const gapCenter = getLayerGapCenter(targetNode, sourceNode, canvasRect);
        const midY = gapCenter ?? (start.y + end.y) / 2;
        return [
            start,
            { x: start.x, y: midY },
            { x: end.x, y: midY },
            end
        ];
    }

    const start = {
        x: sourceRect.right - canvasRect.left,
        y: sourceRect.top + sourceRect.height / 2 - canvasRect.top
    };
    const end = {
        x: targetRect.left - canvasRect.left,
        y: targetRect.top + targetRect.height / 2 - canvasRect.top
    };
    const midX = (start.x + end.x) / 2;
    return [
        start,
        { x: midX, y: start.y },
        { x: midX, y: end.y },
        end
    ];
}

function createRoundedPath(points, radius = 24) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
        const current = points[i];
        const prev = points[i - 1];
        const next = points[i + 1];

        if (!next) {
            d += ` L ${current.x} ${current.y}`;
            break;
        }

        const prevDist = distanceBetween(prev, current);
        const nextDist = distanceBetween(next, current);
        const r = Math.min(radius, prevDist / 2, nextDist / 2);
        const before = movePointTowards(current, prev, r);
        const after = movePointTowards(current, next, r);

        d += ` L ${before.x} ${before.y}`;
        d += ` Q ${current.x} ${current.y} ${after.x} ${after.y}`;
    }

    return d;
}

function movePointTowards(start, target, distance) {
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
        x: start.x + (dx / len) * distance,
        y: start.y + (dy / len) * distance
    };
}

function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function getLayerGapCenter(upperNode, lowerNode, canvasRect) {
    const upperLayerRect = getLayerRect(upperNode);
    const lowerLayerRect = getLayerRect(lowerNode);
    if (!upperLayerRect || !lowerLayerRect) return null;
    if (upperLayerRect.bottom > lowerLayerRect.top) return null;
    return (upperLayerRect.bottom + lowerLayerRect.top) / 2 - canvasRect.top;
}

function getLayerRect(node) {
    const layer = node.closest('.layer');
    return layer ? layer.getBoundingClientRect() : null;
}

export function handleResize() {
    renderConnections();
}
