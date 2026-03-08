let container = null;

function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

export function showToast(message, duration = 2500) {
    const c = ensureContainer();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    c.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}
