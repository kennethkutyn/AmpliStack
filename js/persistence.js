import {
    activeCategory,
    activeModel,
    addedItems,
    amplitudeSdkSelectedBadges,
    customConnections,
    customEntries,
    dismissedConnections,
    connectionAnnotations,
    dottedConnections,
    layerOrder,
    nodeNotes
} from './state.js';

const STORAGE_KEY = 'amplistack-diagram-state-v1';
const URL_PARAM_KEY = 'state';

function cloneLayerOrder() {
    return Object.fromEntries(
        Object.entries(layerOrder).map(([category, slots]) => [
            category,
            Array.isArray(slots) ? [...slots] : []
        ])
    );
}

function mapSetsToArrays(setMap) {
    return Object.fromEntries(
        Object.entries(setMap).map(([category, set]) => [category, Array.from(set)])
    );
}

function cloneCustomEntries() {
    return Object.fromEntries(
        Object.entries(customEntries).map(([category, entries]) => [
            category,
            entries.map(entry => ({ ...entry }))
        ])
    );
}

export function serializeDiagramState() {
    return {
        version: 1,
        activeCategory,
        activeModel,
        addedItems: mapSetsToArrays(addedItems),
        customEntries: cloneCustomEntries(),
        layerOrder: cloneLayerOrder(),
        customConnections: Array.from(customConnections),
        dismissedConnections: Array.from(dismissedConnections),
        dottedConnections: Array.from(dottedConnections),
        connectionAnnotations: { ...connectionAnnotations },
        amplitudeSdkSelectedBadges: Array.from(amplitudeSdkSelectedBadges),
        nodeNotes: { ...nodeNotes }
    };
}

export async function persistDiagramState() {
    const snapshot = serializeDiagramState();
    persistToLocalStorage(snapshot);
    await persistToUrl(snapshot);
}

function persistToLocalStorage(snapshot) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
        console.error('Failed to persist diagram state to localStorage', error);
    }
}

async function persistToUrl(snapshot) {
    if (typeof window === 'undefined' || typeof URL === 'undefined') return;
    try {
        const encoded = await encodeStateForUrl(snapshot);
        const url = new URL(window.location.href);
        url.searchParams.set(URL_PARAM_KEY, encoded);
        window.history.replaceState(null, '', url.toString());
    } catch (error) {
        console.error('Failed to persist diagram state to URL', error);
    }
}

export async function loadDiagramState() {
    const fromUrl = await loadFromUrl();
    if (fromUrl) return fromUrl;
    return loadFromLocalStorage();
}

export function clearPersistedDiagramState() {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage?.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear diagram state from localStorage', error);
        }
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete(URL_PARAM_KEY);
            window.history.replaceState(null, '', url.toString());
        } catch (error) {
            console.error('Failed to clear diagram state from URL', error);
        }
    }
}

function loadFromLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        console.error('Failed to load diagram state from localStorage', error);
        return null;
    }
}

async function loadFromUrl() {
    if (typeof window === 'undefined' || typeof URL === 'undefined') return null;
    try {
        const url = new URL(window.location.href);
        const encoded = url.searchParams.get(URL_PARAM_KEY);
        if (!encoded) return null;
        const json = await decodeStateFromUrl(encoded);
        if (!json) return null;
        return JSON.parse(json);
    } catch (error) {
        console.error('Failed to load diagram state from URL', error);
        return null;
    }
}

async function encodeStateForUrl(snapshot) {
    const json = JSON.stringify(snapshot);
    const bytes = await compressString(json);
    return toBase64Url(bytes);
}

async function decodeStateFromUrl(encoded) {
    if (!encoded) return null;
    const bytes = fromBase64Url(encoded);
    return await decompressToString(bytes);
}

async function compressString(str) {
    const encoder = new TextEncoder();
    const input = encoder.encode(str);
    if (typeof CompressionStream === 'function') {
        try {
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            writer.write(input);
            writer.close();
            const compressed = await new Response(stream.readable).arrayBuffer();
            return new Uint8Array(compressed);
        } catch (error) {
            console.warn('CompressionStream failed, using uncompressed data', error);
        }
    }
    return input;
}

async function decompressToString(bytes) {
    if (!bytes) return null;
    if (typeof DecompressionStream === 'function') {
        try {
            const stream = new DecompressionStream('gzip');
            const writer = stream.writable.getWriter();
            writer.write(bytes);
            writer.close();
            const decompressed = await new Response(stream.readable).arrayBuffer();
            return new TextDecoder().decode(decompressed);
        } catch {
            // Fallback to plain UTF-8 decode
        }
    }
    try {
        return new TextDecoder().decode(bytes);
    } catch (error) {
        console.error('Failed to decode diagram state bytes', error);
        return null;
    }
}

function toBase64Url(bytes) {
    let binary = '';
    bytes.forEach(b => {
        binary += String.fromCharCode(b);
    });
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/')
        + '='.repeat((4 - (str.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

