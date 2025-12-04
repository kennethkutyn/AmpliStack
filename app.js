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
            { id: 'push-notifications', name: 'Push Notifications', icon: 'push' },
            { id: 'social-media', name: 'Social Media', icon: 'social' },
            { id: 'search', name: 'Organic Search', icon: 'search' },
            { id: 'referral', name: 'Referral', icon: 'referral' },
            { id: 'in-app', name: 'In-App Messages', icon: 'in-app' }
        ]
    },
    experiences: {
        name: 'Owned Experiences',
        layer: 'experiences',
        items: [
            { id: 'web-app', name: 'Web App', icon: 'web' },
            { id: 'mobile-app', name: 'Mobile App', icon: 'mobile' },
            { id: 'website', name: 'Website', icon: 'globe' },
            { id: 'landing-pages', name: 'Landing Pages', icon: 'landing' },
            { id: 'checkout', name: 'Checkout', icon: 'checkout' },
            { id: 'onboarding', name: 'Onboarding', icon: 'onboarding' }
        ]
    },
    sources: {
        name: 'Data Sources',
        layer: 'sources',
        items: [
            { id: 'amplitude-sdk', name: 'Amplitude SDK', icon: 'amplitude' },
            { id: 'segment', name: 'Segment', icon: 'segment' },
            { id: 'api', name: 'HTTP API', icon: 'api' },
            { id: 'cdp', name: 'CDP', icon: 'cdp' },
            { id: 'crm', name: 'CRM', icon: 'crm' },
            { id: 'data-warehouse', name: 'Data Warehouse', icon: 'warehouse' }
        ]
    },
    analysis: {
        name: 'Analysis / Warehouse',
        layer: 'analysis',
        items: [
            { id: 'amplitude-analytics', name: 'Amplitude Analytics', icon: 'amplitude' },
            { id: 'snowflake', name: 'Snowflake', icon: 'snowflake' },
            { id: 'bigquery', name: 'BigQuery', icon: 'bigquery' },
            { id: 'redshift', name: 'Redshift', icon: 'redshift' },
            { id: 'databricks', name: 'Databricks', icon: 'databricks' },
            { id: 'looker', name: 'Looker', icon: 'looker' }
        ]
    },
    activation: {
        name: 'Activation',
        layer: 'activation',
        items: [
            { id: 'braze', name: 'Braze', icon: 'braze' },
            { id: 'iterable', name: 'Iterable', icon: 'iterable' },
            { id: 'salesforce', name: 'Salesforce', icon: 'salesforce' },
            { id: 'hubspot', name: 'HubSpot', icon: 'hubspot' },
            { id: 'marketo', name: 'Marketo', icon: 'marketo' },
            { id: 'intercom', name: 'Intercom', icon: 'intercom' }
        ]
    }
};

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
    'segment': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
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
    'braze': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>`,
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
    </svg>`
};

// Track active category
let activeCategory = 'marketing';

// Track which items have been added per layer
const addedItems = {
    marketing: new Set(),
    experiences: new Set(),
    sources: new Set(),
    analysis: new Set(),
    activation: new Set()
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initCategoryPicker();
    renderComponentList(activeCategory);
});

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
    
    categoryData.items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'component-item';
        li.dataset.id = item.id;
        li.dataset.category = category;
        
        // Check if already added
        if (addedItems[category].has(item.id)) {
            li.classList.add('added');
        }
        
        const iconHtml = icons[item.icon] || icons['amplitude'];
        
        li.innerHTML = `
            <div class="component-icon category-${category}">
                ${iconHtml}
            </div>
            <span class="component-name">${item.name}</span>
        `;
        
        li.addEventListener('click', () => {
            addItemToLayer(item.id, item.name, item.icon, category);
        });
        
        list.appendChild(li);
    });
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
    layerContent.appendChild(node);
    
    // Trigger reflow for animation
    node.offsetHeight;
    node.classList.remove('entering');
    
    // Mark as added
    addedItems[category].add(itemId);
    
    // Update sidebar item state
    updateSidebarItemState(itemId, category, true);
}

// Create a diagram node element
function createDiagramNode(itemId, itemName, iconKey, category) {
    const node = document.createElement('div');
    node.className = `diagram-node node-${category}`;
    node.dataset.id = itemId;
    node.dataset.category = category;
    
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
    `;
    
    // Add remove handler
    const removeBtn = node.querySelector('.node-remove');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeItemFromLayer(itemId, category, node);
    });
    
    return node;
}

// Remove an item from its layer
function removeItemFromLayer(itemId, category, node) {
    node.classList.add('removing');
    
    node.addEventListener('animationend', () => {
        node.remove();
        addedItems[category].delete(itemId);
        updateSidebarItemState(itemId, category, false);
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
