function buildConnectionKey(sourceNode, targetNode, tag = 'default') {
    const sourceId = sourceNode?.dataset?.id || sourceNode?.dataset?.category || 'unknown-source';
    const targetId = targetNode?.dataset?.id || targetNode?.dataset?.category || 'unknown-target';
    return `${sourceId}->${targetId}:${tag}`;
}

function buildCustomConnectionKey(sourceId, targetId) {
    return `custom:${sourceId}->${targetId}`;
}

function parseCustomConnectionKey(key) {
    if (!key || !key.startsWith('custom:')) return {};
    const arrowIndex = key.indexOf('->');
    if (arrowIndex === -1) return {};
    const sourceId = key.substring(7, arrowIndex);
    const targetId = key.substring(arrowIndex + 2);
    return { sourceId, targetId };
}

// Architecture Diagram Builder - Main Application

// Category configuration with items
const categories = {
    marketing: {
        name: 'Marketing Channels',
        layer: 'marketing',
        items: [
            { id: 'email', name: 'Email', icon: 'email' },
            { id: 'sms', name: 'SMS', icon: 'sms' },
            { id: 'paid-ads', name: 'Paid Ads', icon: 'paid-ads' },
            { id: 'push-notifications', name: 'Push', icon: 'push' },
            { id: 'social-media', name: 'Social Media', icon: 'social' },
            { id: 'search', name: 'Organic', icon: 'search' },
            { id: 'referral', name: 'Referral', icon: 'referral' },
            { id: 'in-app', name: 'In-App', icon: 'in-app' }
        ]
    },
    experiences: {
        name: 'Owned Experiences',
        layer: 'experiences',
        items: [
            { id: 'web-app', name: 'Web App', icon: 'web' },
            { id: 'mobile-app', name: 'Mobile App', icon: 'mobile' },
            { id: 'website', name: 'Website', icon: 'globe' }
        ]
    },
    sources: {
        name: 'Data Sources',
        layer: 'sources',
        items: [
            { id: 'amplitude-sdk', name: 'Amplitude SDK', icon: 'amplitude-mark' },
            { id: 'segment', name: 'Segment', icon: 'segment-mark' },
            { id: 'api', name: 'HTTP API', icon: 'api' },
            { id: 'cdp', name: 'CDP', icon: 'cdp' },
            { id: 'crm', name: 'CRM', icon: 'crm' }        ]
    },
    analysis: {
        name: 'Analysis / Warehouse',
        layer: 'analysis',
        items: [
            { id: 'amplitude-analytics', name: 'Amplitude Analytics', icon: 'amplitude-mark' },
            { id: 'snowflake', name: 'Snowflake', icon: 'snowflake' },
            { id: 'bigquery', name: 'BigQuery', icon: 'bigquery' },
            { id: 'databricks', name: 'Databricks', icon: 'databricks' },
            { id: 'bi', name: 'BI', icon: 'looker' },
            { id: 's3', name: 'S3', icon: 'looker' }
        ]
    },
    activation: {
        name: 'Activation',
        layer: 'activation',
        items: [
            { id: 'braze', name: 'Braze', icon: 'braze-mark' },
            { id: 'iterable', name: 'Iterable', icon: 'iterable' },
            { id: 'salesforce', name: 'Salesforce', icon: 'salesforce' },
            { id: 'hubspot', name: 'HubSpot', icon: 'hubspot' },
            { id: 'marketo', name: 'Marketo', icon: 'marketo' },
            { id: 'intercom', name: 'Intercom', icon: 'intercom' }
        ]
    }
};

const itemCategoryIndex = {};
Object.entries(categories).forEach(([categoryKey, categoryDef]) => {
    categoryDef.items.forEach(item => {
        itemCategoryIndex[item.id] = categoryKey;
    });
});

const leftMostPriorityMap = {
    'paid-ads': 0,
    'amplitude-sdk': 0,
    'amplitude-analytics': 0
};

const SLOT_COLUMNS = 6;
const layerOrder = {
    marketing: [],
    experiences: [],
    sources: [],
    analysis: [],
    activation: []
};

const dismissedConnections = new Set();
const customConnections = new Set();
let pendingConnectionNode = null;
let draggedNode = null;

// Icon SVG templates
const icons = {
    // Marketing
    'email': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M22 7l-10 7L2 7"/>
    </svg>`,
    'sms': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10h.01M12 10h.01M16 10h.01"/>
    </svg>`,
    'paid-ads': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v12M6 12h12"/>
    </svg>`,
    'push': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>`,
    'social': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>`,
    'search': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
    </svg>`,
    'referral': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,
    'in-app': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>`,
    
    // Experiences
    'web': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>`,
    'mobile': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>`,
    'globe': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>`,
    'landing': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
    </svg>`,
    'checkout': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="21" r="1"/>
        <circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>`,
    'onboarding': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/>
        <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>`,
    
    // Data Sources
    'amplitude': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 22 20 2 20 12 2"/>
    </svg>`,
    'api': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
    </svg>`,
    'cdp': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>`,
    'crm': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,
    'warehouse': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>`,
    
    // Analysis
    'snowflake': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="2" x2="12" y2="22"/>
        <path d="M20 6L4 18"/>
        <path d="M4 6l16 12"/>
        <line x1="4" y1="12" x2="20" y2="12"/>
    </svg>`,
    'bigquery': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
        <line x1="9" y1="15" x2="15" y2="9"/>
    </svg>`,
    'redshift': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
    </svg>`,
    'databricks': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
    </svg>`,
    'looker': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>`,
    
    // Activation
    'segment': `<img src="assets/image-7cdc5575-456d-447a-bf0b-5be09cd63492.png" alt="Segment logo" width="20" height="20" style="display:block;" />`,
    'braze': `<img src="assets/image-437456e2-68fb-462c-a2f0-ea67f946a2e7.png" alt="Braze logo" width="20" height="20" style="display:block;" />`,
    'iterable': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>`,
    'salesforce': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>`,
    'hubspot': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <circle cx="12" cy="5" r="2"/>
        <circle cx="12" cy="19" r="2"/>
        <line x1="12" y1="7" x2="12" y2="9"/>
        <line x1="12" y1="15" x2="12" y2="17"/>
    </svg>`,
    'marketo': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>`,
    'intercom': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>`,
    
    // Custom entry icon
    'custom': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>`,
    'amplitude-mark': `<img src="https://cdn.prod.website-files.com/64da81538e9bdebe7ae2fa11/64ee6c441b07b9e11db3dc92_A%20mark%20circle.svg" alt="Amplitude logo" width="20" height="20" style="display:block;" />`,
    'braze-mark': `<img src="https://cdn-public.softwarereviews.com/production/favicons/offerings/8887/original/braze_fav.png" alt="Braze logo" width="20" height="20" style="display:block;" />`,
    'segment-mark': `<img src="https://cdn.prod.website-files.com/60a4d4a53dd0c3f45579ac64/60ccab91521f5d2546df4610_5e8db5423d0e429ff92af6d4_segment-logo-FCBB33F58E-seeklogo.com.png" alt="Segment logo" width="20" height="20" style="display:block;" />`
};

// Connection model definitions
const cdpLikeSourceIds = ['cdp', 'segment'];
const primaryWarehouseNodeIds = ['bigquery', 'databricks', 'snowflake'];
const warehouseNodeIds = [...primaryWarehouseNodeIds, 's3'];

const globalConnectionRules = [
    {
        from: { category: 'marketing' },
        to: { category: 'experiences' },
        exclusions: [
            { sourceIds: ['push-notifications'], targetIds: ['web-app', 'website'] }
        ]
    },
    { from: { category: 'experiences' }, to: { ids: ['amplitude-sdk'] } },
    { from: { category: 'experiences' }, to: { ids: cdpLikeSourceIds } },
    { from: { ids: ['amplitude-sdk'] }, to: { ids: ['amplitude-analytics'] } },
    {
        from: { ids: cdpLikeSourceIds },
        to: { category: 'analysis' },
        exclusions: [
            { targetIds: ['bi'] }
        ]
    },
    { from: { ids: cdpLikeSourceIds }, to: { category: 'activation' } },
    { from: { ids: ['amplitude-analytics'] }, to: { ids: primaryWarehouseNodeIds } },
    { from: { ids: ['amplitude-analytics'] }, to: { category: 'activation' } },
    { from: { ids: warehouseNodeIds }, to: { ids: ['bi'] } }
];

const connectionModels = {
    'amplitude-to-warehouse': {
        name: 'Amplitude → Warehouse',
        rules: []
    },
    'warehouse-to-amplitude': {
        name: 'Warehouse → Amplitude',
        rules: []
    },
    'cdp-in-the-middle': {
        name: 'CDP in the Middle',
        rules: []
    },
    'amplitude-as-activation': {
        name: 'Amplitude as Activation',
        rules: []
    }
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const CONNECTION_COLOR = 'rgba(100, 116, 139, 0.75)';

// Track active category
let activeCategory = 'marketing';
let activeModel = 'amplitude-to-warehouse';

// Track which items have been added per layer
const addedItems = {
    marketing: new Set(),
    experiences: new Set(),
    sources: new Set(),
    analysis: new Set(),
    activation: new Set()
};

// Track custom entries per category
const customEntries = {
    marketing: [],
    experiences: [],
    sources: [],
    analysis: [],
    activation: []
};

// Counter for unique custom entry IDs
let customEntryCounter = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initCategoryPicker();
    initCustomEntryInput();
    initModelPicker();
    initLayerDragTargets();
    initExportButton();
    renderComponentList(activeCategory);
    renderConnections();
    window.addEventListener('resize', handleResize);
});

// Initialize custom entry input
function initCustomEntryInput() {
    const input = document.getElementById('custom-entry-input');
    const addBtn = document.getElementById('add-custom-btn');
    
    // Add on button click
    addBtn.addEventListener('click', () => {
        addCustomEntry();
    });
    
    // Add on Enter key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addCustomEntry();
        }
    });
}

// Add a custom entry to the current category
function addCustomEntry() {
    const input = document.getElementById('custom-entry-input');
    const name = input.value.trim();
    
    if (!name) return;
    
    // Generate unique ID
    const id = `custom-${activeCategory}-${++customEntryCounter}`;
    
    // Create custom entry
    const entry = {
        id: id,
        name: name,
        icon: 'custom',
        isCustom: true
    };
    
    // Add to custom entries for this category
    customEntries[activeCategory].push(entry);
    itemCategoryIndex[id] = activeCategory;
    
    // Clear input
    input.value = '';
    
    // Re-render the list to show the new entry
    renderComponentList(activeCategory);
    
    // Scroll to bottom of list to show new entry
    const list = document.getElementById('component-list');
    list.scrollTop = list.scrollHeight;
}

// Initialize category picker
function initCategoryPicker() {
    const tabs = document.querySelectorAll('.category-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            switchCategory(category);
        });
    });
}

// Initialize model picker
function initModelPicker() {
    const modelButtons = document.querySelectorAll('.model-option');
    modelButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modelId = button.dataset.model;
            if (modelId && modelId !== activeModel) {
                activeModel = modelId;
                updateModelPickerState();
                renderConnections();
            }
        });
    });
    updateModelPickerState();
}

function initLayerDragTargets() {
    document.querySelectorAll('.layer-content').forEach(content => {
        content.addEventListener('dragover', handleLayerDragOver);
        content.addEventListener('dragleave', handleLayerDragLeave);
        content.addEventListener('drop', handleLayerDrop);
    });
}

// Dynamically load html2canvas when needed
function loadHtml2Canvas() {
    if (window.html2canvas) {
        return Promise.resolve(window.html2canvas);
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.async = true;
        script.onload = () => resolve(window.html2canvas);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function initExportButton() {
    const exportBtn = document.getElementById('export-btn');
    if (!exportBtn) return;
    exportBtn.addEventListener('click', async () => {
        try {
            const canvasElement = document.querySelector('.canvas');
            if (!canvasElement) return;
            await loadHtml2Canvas();
            exportBtn.disabled = true;
            exportBtn.textContent = 'Exporting...';
            const options = {
                backgroundColor: '#FFFFFF',
                scale: window.devicePixelRatio || 2,
                scrollX: 0,
                scrollY: -window.scrollY,
                useCORS: true
            };

            if (window.visualViewport) {
                options.width = canvasElement.offsetWidth;
                options.height = canvasElement.offsetHeight;
            }

            const canvas = await window.html2canvas(canvasElement, options);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) return;
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `amplistack-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed', error);
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export';
        }
    });
}

function updateModelPickerState() {
    const modelButtons = document.querySelectorAll('.model-option');
    modelButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.model === activeModel);
    });
}

// Switch to a different category
function switchCategory(category) {
    if (category === activeCategory) return;
    
    // Update active tab
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    activeCategory = category;
    renderComponentList(category);
}

// Render the component list for a category
function renderComponentList(category) {
    const list = document.getElementById('component-list');
    const categoryData = categories[category];
    
    list.innerHTML = '';
    list.dataset.category = category;
    
    // Render built-in items
    categoryData.items.forEach(item => {
        const li = createComponentListItem(item, category, false);
        list.appendChild(li);
    });
    
    // Render custom entries for this category
    customEntries[category].forEach(item => {
        const li = createComponentListItem(item, category, true);
        list.appendChild(li);
    });
}

// Create a component list item
function createComponentListItem(item, category, isCustom) {
    const li = document.createElement('li');
    li.className = 'component-item';
    li.dataset.id = item.id;
    li.dataset.category = category;
    
    if (isCustom) {
        li.classList.add('custom-entry');
    }
    
    // Check if already added
    if (addedItems[category].has(item.id)) {
        li.classList.add('added');
    }
    
    const iconHtml = isCustom ? icons['custom'] : (icons[item.icon] || icons['amplitude']);
    
    li.innerHTML = `
        <div class="component-icon category-${category}">
            ${iconHtml}
        </div>
        <span class="component-name">${item.name}</span>
    `;
    
    li.addEventListener('click', () => {
        addItemToLayer(item.id, item.name, isCustom ? 'custom' : item.icon, category);
    });
    
    return li;
}

// Add an item to its corresponding layer
function addItemToLayer(itemId, itemName, iconKey, category) {
    // Check if already added
    if (addedItems[category].has(itemId)) {
        // Highlight existing node
        const existingNode = document.querySelector(`.layer[data-layer="${category}"] .diagram-node[data-id="${itemId}"]`);
        if (existingNode) {
            existingNode.classList.add('highlight');
            setTimeout(() => existingNode.classList.remove('highlight'), 600);
        }
        return;
    }
    
    // Get the layer content container
    const layer = document.querySelector(`.layer[data-layer="${category}"]`);
    const layerContent = layer.querySelector('.layer-content');
    
    // Create the diagram node
    const node = createDiagramNode(itemId, itemName, iconKey, category);
    
    // Add to the layer with animation
    node.classList.add('entering');
    const slotIndex = assignNodeSlot(category, itemId);
    setNodeSlotPosition(node, slotIndex);
    layerContent.appendChild(node);
    enforceNodeOrdering();
    
    // Trigger reflow for animation
    node.offsetHeight;
    node.classList.remove('entering');
    
    // Mark as added
    addedItems[category].add(itemId);
    
    // Update sidebar item state
    updateSidebarItemState(itemId, category, true);
    renderConnections();
}

// Create a diagram node element
function createDiagramNode(itemId, itemName, iconKey, category) {
    const node = document.createElement('div');
    node.className = `diagram-node node-${category}`;
    node.dataset.id = itemId;
    node.dataset.category = category;
    node.setAttribute('draggable', 'true');
    
    const iconHtml = icons[iconKey] || icons['amplitude'];
    
    node.innerHTML = `
        <div class="node-icon category-${category}">${iconHtml}</div>
        <span class="node-label">${itemName}</span>
        <button class="node-remove" title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
        <button class="node-connect" title="Draw connection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
        </button>
    `;
    
    // Add remove handler
    const removeBtn = node.querySelector('.node-remove');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pendingConnectionNode === node) {
            clearPendingConnection();
        }
        removeItemFromLayer(itemId, category, node);
    });
    
    const connectBtn = node.querySelector('.node-connect');
    connectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startConnectionFromNode(node);
    });
    
    node.addEventListener('click', () => {
        handleNodeClick(node);
    });

    node.addEventListener('dragstart', handleDragStart);
    node.addEventListener('dragend', handleDragEnd);
    
    return node;
}

// Remove an item from its layer
function removeItemFromLayer(itemId, category, node) {
    node.classList.add('removing');
    
    node.addEventListener('animationend', () => {
        node.remove();
        addedItems[category].delete(itemId);
        const slots = ensureLayerSlots(category);
        const index = slots.indexOf(itemId);
        if (index !== -1) {
            slots[index] = null;
        }
        updateSidebarItemState(itemId, category, false);
        removeRelatedCustomConnections(itemId);
        enforceNodeOrdering();
        renderConnections();
    });
}

// Update sidebar item to show added/available state
function updateSidebarItemState(itemId, category, isAdded) {
    // Only update if viewing the same category
    if (category !== activeCategory) return;
    
    const sidebarItem = document.querySelector(`.component-item[data-id="${itemId}"][data-category="${category}"]`);
    if (sidebarItem) {
        sidebarItem.classList.toggle('added', isAdded);
    }
}

function updateLayerSpacing() {
    // spacing handled purely via CSS grid; function kept for API compatibility
}

function gatherCategoriesFromSelector(selector = {}, set) {
    if (!selector) return;
    if (selector.category) {
        set.add(selector.category);
    }
    if (selector.ids) {
        selector.ids.forEach(id => {
            if (itemCategoryIndex[id]) {
                set.add(itemCategoryIndex[id]);
            }
        });
    }
}

function enforceNodeOrdering() {
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
        // place nodes without slots at end
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
            const priorityDiff = (leftMostPriorityMap[a.dataset.id] ?? 100) - (leftMostPriorityMap[b.dataset.id] ?? 100);
            if (priorityDiff !== 0) return priorityDiff;
            return slotA - slotB;
        });
        orderedNodes.forEach(node => content.appendChild(node));
    });
}

function startConnectionFromNode(node) {
    if (pendingConnectionNode === node) {
        clearPendingConnection();
        return;
    }
    clearPendingConnection();
    pendingConnectionNode = node;
    node.classList.add('pending-connection');
}

function handleNodeClick(node) {
    if (draggedNode) return;
    if (!pendingConnectionNode) return;
    if (pendingConnectionNode === node) {
        clearPendingConnection();
        return;
    }
    addCustomConnection(pendingConnectionNode.dataset.id, node.dataset.id);
    clearPendingConnection();
}

function clearPendingConnection() {
    if (pendingConnectionNode) {
        pendingConnectionNode.classList.remove('pending-connection');
        pendingConnectionNode = null;
    }
}

function addCustomConnection(sourceId, targetId) {
    if (!sourceId || !targetId) return;
    const key = buildCustomConnectionKey(sourceId, targetId);
    customConnections.add(key);
    dismissedConnections.delete(key);
    renderConnections();
}

function removeRelatedCustomConnections(nodeId) {
    const toDelete = [];
    customConnections.forEach(key => {
        const { sourceId, targetId } = parseCustomConnectionKey(key);
        if (sourceId === nodeId || targetId === nodeId) {
            toDelete.push(key);
        }
    });
    toDelete.forEach(key => {
        customConnections.delete(key);
        dismissedConnections.delete(key);
    });
}

function ensureLayerSlots(category) {
    if (!layerOrder[category]) {
        layerOrder[category] = [];
    }
    return layerOrder[category];
}

function assignNodeSlot(category, itemId) {
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

function setNodeSlotPosition(node, slotIndex) {
    node.dataset.slotIndex = slotIndex;
    const column = (slotIndex % SLOT_COLUMNS) + 1;
    const row = Math.floor(slotIndex / SLOT_COLUMNS) + 1;
    node.style.gridColumn = `${column} / span 1`;
    node.style.gridRow = `${row} / span 1`;
}

function handleDragStart(e) {
    draggedNode = e.currentTarget;
    if (!draggedNode) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedNode.dataset.id);
    requestAnimationFrame(() => draggedNode.classList.add('dragging'));
}

function handleDragEnd() {
    if (draggedNode) {
        draggedNode.classList.remove('dragging');
        draggedNode = null;
    }
    document.querySelectorAll('.layer-content.drag-over').forEach(content => content.classList.remove('drag-over'));
}

function handleLayerDragOver(e) {
    if (!draggedNode) return;
    const content = e.currentTarget;
    const targetCategory = getLayerCategoryFromContent(content);
    if (targetCategory !== draggedNode.dataset.category) return;
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
    }
    content.classList.add('drag-over');
}

function handleLayerDragLeave(e) {
    if (!draggedNode) return;
    const content = e.currentTarget;
    if (!content.contains(e.relatedTarget)) {
        content.classList.remove('drag-over');
    }
}

function handleLayerDrop(e) {
    if (!draggedNode) return;
    const content = e.currentTarget;
    const targetCategory = getLayerCategoryFromContent(content);
    if (targetCategory !== draggedNode.dataset.category) return;
    e.preventDefault();
    const slotIndex = getSlotIndex(content, e.clientX);
    updateLayerOrderForNode(targetCategory, draggedNode.dataset.id, slotIndex);
    setNodeSlotPosition(draggedNode, slotIndex);
    content.classList.remove('drag-over');
    enforceNodeOrdering();
    renderConnections();
    handleDragEnd();
}

function getLayerCategoryFromContent(content) {
    return content?.parentElement?.dataset?.layer || content?.dataset?.layer || content?.closest('.layer')?.dataset?.layer || null;
}

function updateLayerOrderFromDom(content, category) {
    if (!category) return;
    const nodes = Array.from(content.querySelectorAll('.diagram-node'));
    layerOrder[category] = nodes.map(node => node.dataset.id);
}

function getSlotIndex(content, clientX) {
    const rect = content.getBoundingClientRect();
    const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width - 1);
    const slotWidth = rect.width / SLOT_COLUMNS || 1;
    const column = Math.min(SLOT_COLUMNS - 1, Math.max(0, Math.floor(relativeX / slotWidth)));
    const currentSlot = Number(draggedNode?.dataset?.slotIndex) || 0;
    const currentRow = Math.floor(currentSlot / SLOT_COLUMNS);
    return currentRow * SLOT_COLUMNS + column;
}

function updateLayerOrderForNode(category, nodeId, slotIndex) {
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

// ---- Connection rendering ----

function renderConnections() {
    const canvas = document.querySelector('.canvas');
    const model = connectionModels[activeModel];
    if (!canvas || !model) return;

    const combinedRuleDescriptors = [
        ...globalConnectionRules.map((rule, idx) => ({ rule, tag: `global-${idx}` })),
        ...(model.rules || []).map((rule, idx) => ({ rule, tag: `model-${activeModel}-${idx}` }))
    ];
    const combinedRules = combinedRuleDescriptors.map(descriptor => descriptor.rule);

    updateLayerSpacing();
    
    const svg = ensureConnectionLayer();
    if (!svg) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    svg.setAttribute('width', canvasRect.width);
    svg.setAttribute('height', canvasRect.height);
    svg.setAttribute('viewBox', `0 0 ${canvasRect.width} ${canvasRect.height}`);
    svg.innerHTML = '';
    
    svg.appendChild(createArrowMarker());
    
    const connections = [];
    
    combinedRuleDescriptors.forEach(({ rule, tag }) => {
        const sources = resolveSelectorNodes(rule.from);
        const targets = resolveSelectorNodes(rule.to);
        
        sources.forEach(sourceNode => {
            targets.forEach(targetNode => {
                if (sourceNode === targetNode) return;
                if (shouldSkipConnection(rule, sourceNode, targetNode)) return;
                const key = buildConnectionKey(sourceNode, targetNode, `rule-${tag}`);
                if (dismissedConnections.has(key)) return;
                const path = buildConnectorPath(sourceNode, targetNode, canvasRect);
                if (path) {
                    path.dataset.connectionKey = key;
                    svg.appendChild(path);
                    connections.push(path);
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
            svg.appendChild(path);
            connections.push(path);
        }
    });

    const paidAdsPath = renderPaidAdsAdditionalConnection(svg, canvasRect);
    if (paidAdsPath) {
        connections.push(paidAdsPath);
    }
    
    connections.forEach(path => {
        path.addEventListener('click', () => {
            const key = path.dataset.connectionKey;
            if (key) {
                dismissedConnections.add(key);
            }
            path.remove();
        }, { once: true });
    });
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
    if (!marketingLayer || !analysisLayer) return;

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
    if (!pathData) return;

    const path = document.createElementNS(SVG_NS, 'path');
    path.dataset.connectionKey = 'paid-ads-direct';
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', CONNECTION_COLOR);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('marker-end', 'url(#connection-arrow)');
    svg.appendChild(path);
    return path;
}

function buildActivationToMarketingPath(sourceNode, targetNode, canvasRect) {
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const start = {
        x: sourceRect.left + sourceRect.width / 2 - canvasRect.left,
        y: sourceRect.bottom - canvasRect.top
    };
    const targetTop = {
        x: targetRect.left + targetRect.width / 2 - canvasRect.left,
        y: targetRect.top - canvasRect.top
    };
    const canvasRight = Math.max(canvasRect.width - 24, start.x + 24);
    const topMargin = 24;
    const offsetDown = Math.min(32, canvasRect.height - start.y - 24);

    const points = [
        start,
        { x: start.x, y: start.y + offsetDown },
        { x: canvasRight, y: start.y + offsetDown },
        { x: canvasRight, y: topMargin },
        { x: targetTop.x, y: topMargin },
        targetTop
    ];

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

function calculateConnectorPoints(sourceNode, targetNode, sourceRect, targetRect, canvasRect) {
    if (!sourceRect || !targetRect) return null;
    const verticalGap = targetRect.top - sourceRect.bottom;
    const reverseVerticalGap = sourceRect.top - targetRect.bottom;
    const tolerance = 8;
    
    if (verticalGap > tolerance) {
        // source above target
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
        // target above source
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
    
    // Default to horizontal routing
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

function handleResize() {
    renderConnections();
}
