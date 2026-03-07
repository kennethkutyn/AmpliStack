import {
    activeCategory,
    activeModel,
    addedItems,
    amplitudeSdkSelectedBadges,
    diagramTitle,
    lastEditedAt,
    customConnections,
    customEntries,
    dismissedConnections,
    connectionAnnotations,
    dottedConnections,
    layerOrder,
    nodeNotes
} from './state.js';
import { isLoggedIn } from './auth.js';
import { saveDiagram, loadDiagram as apiLoadDiagram } from './api.js';

const STORAGE_KEY = 'amplistack-diagram-state-v1';
const URL_PARAM_KEY = 'state';
const SHORTCODE_PARAM = 'd';

let currentShortCode = null;
let dbSaveTimer = null;
const DB_SAVE_DEBOUNCE = 2000;

export function getCurrentShortCode() { return currentShortCode; }
export function setCurrentShortCode(code) { currentShortCode = code; }

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
        diagramTitle,
        lastEditedAt,
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

    if (isLoggedIn() && currentShortCode) {
        // Debounced save to database
        debouncedDbSave(snapshot);
        // Keep short URL clean (no encoded state param)
        updateUrlWithShortCode();
    } else {
        await persistToUrl(snapshot);
    }
}

function debouncedDbSave(snapshot) {
    if (dbSaveTimer) clearTimeout(dbSaveTimer);
    dbSaveTimer = setTimeout(async () => {
        try {
            await saveDiagram(snapshot.diagramTitle, snapshot, currentShortCode);
        } catch (err) {
            console.error('Failed to save diagram to database:', err);
        }
    }, DB_SAVE_DEBOUNCE);
}

function updateUrlWithShortCode() {
    if (!currentShortCode) return;
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM_KEY);
    url.searchParams.set(SHORTCODE_PARAM, currentShortCode);
    window.history.replaceState(null, '', url.toString());
}

export async function saveToDatabase() {
    if (!isLoggedIn()) throw new Error('Must be logged in to save');
    const snapshot = serializeDiagramState();

    const result = await saveDiagram(snapshot.diagramTitle, snapshot, currentShortCode || null);
    currentShortCode = result.short_code;
    updateUrlWithShortCode();
    return result;
}

export async function loadFromDatabase(shortCode) {
    const result = await apiLoadDiagram(shortCode);
    if (result.error) return result;
    currentShortCode = shortCode;
    return result.state_json;
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
        url.searchParams.delete(SHORTCODE_PARAM);
        window.history.replaceState(null, '', url.toString());
    } catch (error) {
        console.error('Failed to persist diagram state to URL', error);
    }
}

export async function loadDiagramState() {
    // Priority: short code > URL state > localStorage
    const shortCodeState = await loadFromShortCode();
    if (shortCodeState) return shortCodeState;

    const fromUrl = await loadFromUrl();
    if (fromUrl) return fromUrl;
    return loadFromLocalStorage();
}

async function loadFromShortCode() {
    if (typeof window === 'undefined') return null;
    const url = new URL(window.location.href);
    const shortCode = url.searchParams.get(SHORTCODE_PARAM);
    if (!shortCode) return null;

    // Need to be logged in to load from database
    if (!isLoggedIn()) {
        // Store the short code so we can load after login
        window._pendingShortCode = shortCode;
        return null;
    }

    try {
        const result = await loadFromDatabase(shortCode);
        if (result?.error === 'auth_required') {
            window._pendingShortCode = shortCode;
            return null;
        }
        return result;
    } catch (err) {
        console.error('Failed to load diagram from database:', err);
        return null;
    }
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
            url.searchParams.delete(SHORTCODE_PARAM);
            window.history.replaceState(null, '', url.toString());
        } catch (error) {
            console.error('Failed to clear diagram state from URL', error);
        }
    }
    currentShortCode = null;
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
