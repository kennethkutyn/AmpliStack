const TOKEN_KEY = 'amplistack-auth-token';
const USER_KEY = 'amplistack-auth-user';

let currentUser = null;
let authToken = null;
let onAuthChangeCallbacks = [];

export function getUser() { return currentUser; }
export function getToken() { return authToken; }
export function isLoggedIn() { return !!currentUser && !!authToken; }

export function onAuthChange(cb) {
    onAuthChangeCallbacks.push(cb);
}

function notifyAuthChange() {
    onAuthChangeCallbacks.forEach(cb => cb(currentUser));
}

function getApiBase() {
    return window.AMPLISTACK_API_BASE_URL || '';
}

export function restoreSession() {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const user = localStorage.getItem(USER_KEY);
        if (token && user) {
            authToken = token;
            currentUser = JSON.parse(user);
            notifyAuthChange();
        }
    } catch {
        // ignore
    }
}

export async function handleGoogleCredential(credential) {
    const res = await fetch(`${getApiBase()}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem(TOKEN_KEY, authToken);
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    notifyAuthChange();
    return currentUser;
}

export function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    notifyAuthChange();
}

let googleInitialized = false;

function doGoogleInit(buttonEl) {
    const clientId = window.AMPLISTACK_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return false;

    if (!googleInitialized) {
        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
                try {
                    await handleGoogleCredential(response.credential);
                } catch (err) {
                    console.error('Google login failed:', err);
                    alert('Login failed. Only @amplitude.com accounts are allowed.');
                }
            },
            hosted_domain: 'amplitude.com',
            auto_select: false
        });
        googleInitialized = true;
    }
    window.google.accounts.id.renderButton(buttonEl, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        size: 'medium',
        text: 'signin_with',
        width: 210
    });
    return true;
}

export function initGoogleSignIn(buttonEl) {
    if (doGoogleInit(buttonEl)) return;

    // GIS library not loaded yet — wait for it
    const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
            clearInterval(interval);
            doGoogleInit(buttonEl);
        }
    }, 200);
    // Stop trying after 10s
    setTimeout(() => clearInterval(interval), 10000);
}

export function renderAuthUI() {
    const container = document.getElementById('auth-container');
    if (!container) return;

    if (isLoggedIn()) {
        container.innerHTML = `
            <div class="auth-user">
                <img class="auth-avatar" src="${currentUser.avatar_url || ''}" alt="" referrerpolicy="no-referrer">
                <span class="auth-name">${currentUser.name}</span>
                <button class="auth-logout-btn" id="auth-logout-btn" title="Sign out">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                </button>
            </div>`;
        document.getElementById('auth-logout-btn')?.addEventListener('click', logout);
    } else {
        container.innerHTML = '<div id="google-signin-btn"></div>';
        const btn = document.getElementById('google-signin-btn');
        if (btn) initGoogleSignIn(btn);
    }

    // Show/hide save button
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.style.display = isLoggedIn() ? '' : 'none';

    // Show/hide my diagrams button
    const diagramsBtn = document.getElementById('my-diagrams-btn');
    if (diagramsBtn) diagramsBtn.style.display = isLoggedIn() ? '' : 'none';
}
