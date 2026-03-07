import { getToken } from './auth.js';

function getApiBase() {
    return window.AMPLISTACK_API_BASE_URL || '';
}

function authHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

export async function saveDiagram(title, stateJson, shortCode = null) {
    if (shortCode) {
        const res = await fetch(`${getApiBase()}/api/diagrams/${shortCode}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ title, state_json: stateJson })
        });
        if (!res.ok) throw new Error('Failed to update diagram');
        return res.json();
    }
    const res = await fetch(`${getApiBase()}/api/diagrams`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title, state_json: stateJson })
    });
    if (!res.ok) throw new Error('Failed to save diagram');
    return res.json();
}

export async function loadDiagram(shortCode) {
    const res = await fetch(`${getApiBase()}/api/diagrams/${shortCode}`, {
        headers: authHeaders()
    });
    if (res.status === 401 || res.status === 403) {
        return { error: 'auth_required', status: res.status };
    }
    if (!res.ok) throw new Error('Failed to load diagram');
    return res.json();
}

export async function listDiagrams() {
    const res = await fetch(`${getApiBase()}/api/diagrams`, {
        headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to list diagrams');
    return res.json();
}

export async function forkDiagram(shortCode) {
    const res = await fetch(`${getApiBase()}/api/diagrams/${shortCode}/fork`, {
        method: 'POST',
        headers: authHeaders()
    });
    if (!res.ok) throw new Error('Failed to fork diagram');
    return res.json();
}
