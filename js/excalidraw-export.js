import { getDiagramTitle } from './state.js';

const LAYER_COLORS = {
    marketing:   { bg: '#E0F2FE', border: '#7DD3FC' },
    experiences: { bg: '#FCE7F3', border: '#F9A8D4' },
    sources:     { bg: '#FEF3C7', border: '#FCD34D' },
    analysis:    { bg: '#E0E7FF', border: '#A5B4FC' },
    activation:  { bg: '#D1FAE5', border: '#6EE7B7' }
};

const NODE_BORDER_COLORS = {
    marketing:   '#7DD3FC',
    experiences: '#F9A8D4',
    sources:     '#FCD34D',
    analysis:    '#A5B4FC',
    activation:  '#6EE7B7'
};

let idCounter = 0;
function genId() {
    idCounter += 1;
    return `excal_${idCounter}_${Date.now().toString(36)}`;
}

function makeRect({ x, y, width, height, strokeColor = '#000000', backgroundColor = 'transparent', fillStyle = 'solid', strokeWidth = 2, roundness = null, opacity = 100 }) {
    return {
        type: 'rectangle',
        id: genId(),
        x, y, width, height,
        strokeColor,
        backgroundColor,
        fillStyle,
        strokeWidth,
        roughness: 0,
        opacity,
        angle: 0,
        strokeStyle: 'solid',
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        groupIds: [],
        frameId: null,
        roundness: roundness || { type: 3 }
    };
}

function makeText({ x, y, text, fontSize = 16, fontFamily = 1, textAlign = 'left', verticalAlign = 'top', width = null, height = null, strokeColor = '#000000' }) {
    const w = width || text.length * fontSize * 0.6;
    const h = height || fontSize * 1.4;
    return {
        type: 'text',
        id: genId(),
        x, y,
        width: w,
        height: h,
        text,
        fontSize,
        fontFamily,
        textAlign,
        verticalAlign,
        strokeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 0,
        opacity: 100,
        angle: 0,
        strokeStyle: 'solid',
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        groupIds: [],
        frameId: null,
        roundness: null,
        baseline: Math.floor(fontSize * 0.8),
        containerId: null,
        originalText: text,
        autoResize: true,
        lineHeight: 1.25
    };
}

function makeArrow({ points, strokeColor = '#64748b', strokeWidth = 2, strokeStyle = 'solid' }) {
    const startX = points[0][0];
    const startY = points[0][1];
    const relativePoints = points.map(([px, py]) => [px - startX, py - startY]);

    return {
        type: 'arrow',
        id: genId(),
        x: startX,
        y: startY,
        width: Math.abs(relativePoints[relativePoints.length - 1][0]),
        height: Math.abs(relativePoints[relativePoints.length - 1][1]),
        strokeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth,
        roughness: 0,
        opacity: 100,
        angle: 0,
        strokeStyle,
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        groupIds: [],
        frameId: null,
        roundness: { type: 2 },
        points: relativePoints,
        lastCommittedPoint: null,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: 'arrow',
        elbowed: false
    };
}

function parseSvgPath(d) {
    if (!d) return [];
    const points = [];
    const commands = d.match(/[MLCQZmlcqz][^MLCQZmlcqz]*/gi) || [];
    for (const cmd of commands) {
        const type = cmd[0];
        const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (type === 'M' || type === 'L') {
            for (let i = 0; i < nums.length; i += 2) {
                points.push([nums[i], nums[i + 1]]);
            }
        } else if (type === 'Q') {
            // Quadratic bezier: just take the endpoint
            if (nums.length >= 4) {
                points.push([nums[2], nums[3]]);
            }
        } else if (type === 'C') {
            // Cubic bezier: just take the endpoint
            if (nums.length >= 6) {
                points.push([nums[4], nums[5]]);
            }
        }
    }
    return points;
}

function getConnectionLabel(svgEl, pathEl) {
    if (!svgEl || !pathEl) return null;
    const key = pathEl.dataset?.connectionKey;
    if (!key) return null;
    const labels = svgEl.querySelectorAll('text');
    for (const label of labels) {
        const textKey = label.dataset?.connectionKey || label.dataset?.labelKey || '';
        if (textKey === key || textKey.startsWith(key)) {
            return label.textContent?.trim() || null;
        }
    }
    return null;
}

export function exportToExcalidraw() {
    idCounter = 0;
    const elements = [];
    const canvas = document.querySelector('.canvas');
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();

    // Collect layers
    const layers = canvas.querySelectorAll('.layer');
    layers.forEach(layer => {
        const layerKey = layer.dataset.layer;
        const colors = LAYER_COLORS[layerKey] || { bg: '#f0f0f0', border: '#cccccc' };
        const rect = layer.getBoundingClientRect();
        const x = rect.left - canvasRect.left;
        const y = rect.top - canvasRect.top;

        // Layer background rectangle
        elements.push(makeRect({
            x, y,
            width: rect.width,
            height: rect.height,
            strokeColor: colors.border,
            backgroundColor: colors.bg,
            fillStyle: 'solid',
            strokeWidth: 2,
            opacity: 100
        }));

        // Layer label
        const labelEl = layer.querySelector('.layer-label');
        if (labelEl) {
            const labelRect = labelEl.getBoundingClientRect();
            elements.push(makeText({
                x: labelRect.left - canvasRect.left,
                y: labelRect.top - canvasRect.top,
                text: labelEl.textContent?.trim() || layerKey,
                fontSize: 14,
                strokeColor: '#64748b'
            }));
        }
    });

    // Collect nodes
    const nodeMap = new Map(); // node DOM element -> excalidraw element id
    const nodes = canvas.querySelectorAll('.diagram-node');
    nodes.forEach(node => {
        const category = node.dataset.category;
        const borderColor = NODE_BORDER_COLORS[category] || '#cccccc';
        const rect = node.getBoundingClientRect();
        const x = rect.left - canvasRect.left;
        const y = rect.top - canvasRect.top;

        const groupId = genId();

        // Node rectangle
        const nodeRect = makeRect({
            x, y,
            width: rect.width,
            height: rect.height,
            strokeColor: borderColor,
            backgroundColor: '#ffffff',
            fillStyle: 'solid',
            strokeWidth: 2
        });
        nodeRect.groupIds = [groupId];
        elements.push(nodeRect);
        nodeMap.set(node, nodeRect.id);

        // Node label
        const labelEl = node.querySelector('.node-label');
        if (labelEl) {
            const labelText = labelEl.textContent?.trim() || node.dataset.id;
            const textEl = makeText({
                x: x + 46,
                y: y + rect.height / 2 - 9,
                text: labelText,
                fontSize: 14,
                strokeColor: '#1F2937'
            });
            textEl.groupIds = [groupId];
            elements.push(textEl);
        }
    });

    // Collect connections from SVG
    const svg = document.getElementById('connection-layer');
    if (svg) {
        const paths = svg.querySelectorAll('path[data-connection-key]');
        paths.forEach(pathEl => {
            if (pathEl.classList.contains('connection-hit-area')) return;
            const d = pathEl.getAttribute('d');
            const points = parseSvgPath(d);
            if (points.length < 2) return;

            const isDotted = pathEl.getAttribute('stroke-dasharray');
            const arrow = makeArrow({
                points,
                strokeColor: '#64748b',
                strokeWidth: 2,
                strokeStyle: isDotted ? 'dashed' : 'solid'
            });
            elements.push(arrow);

            // Connection label
            const labelText = getConnectionLabel(svg, pathEl);
            if (labelText) {
                const midIdx = Math.floor(points.length / 2);
                const midPoint = points[midIdx] || points[0];
                elements.push(makeText({
                    x: midPoint[0] + 4,
                    y: midPoint[1] - 12,
                    text: labelText,
                    fontSize: 11,
                    strokeColor: '#64748b'
                }));
            }
        });
    }

    // Build the .excalidraw file
    const title = getDiagramTitle() || 'Untitled Diagram';
    const file = {
        type: 'excalidraw',
        version: 2,
        source: 'https://amplistack.com',
        elements,
        appState: {
            gridSize: null,
            viewBackgroundColor: '#ffffff'
        },
        files: {}
    };

    const json = JSON.stringify(file, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.excalidraw`;
    link.click();
    URL.revokeObjectURL(url);
}
