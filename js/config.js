// Centralized configuration and static data for the diagram

export const categories = {
    marketing: {
        name: 'Marketing Channels',
        layer: 'marketing',
        items: [
            { id: 'paid-ads', name: 'Paid Ads', icon: 'paid-ads' },
            { id: 'email', name: 'Email', icon: 'email' },
            { id: 'sms', name: 'SMS', icon: 'sms' },
            { id: 'push-notifications', name: 'Push', icon: 'push' },
            { id: 'social-media', name: 'Social Media', icon: 'social' },
            { id: 'search', name: 'Organic', icon: 'search' },
            { id: 'referral', name: 'Referral', icon: 'referral' }
        ]
    },
    experiences: {
        name: 'Owned Experiences',
        layer: 'experiences',
        items: [
            { id: 'website', name: 'Website', icon: 'globe' },
            { id: 'web-app', name: 'Web App', icon: 'web' },
            { id: 'mobile-app', name: 'Mobile App', icon: 'mobile' },
            { id: 'ott', name: 'OTT', icon: 'ott' },
            { id: 'call-center', name: 'Call Center', icon: 'call-center' },
            { id: 'pos', name: 'PoS', icon: 'pos' }
        ]
    },
    sources: {
        name: 'Data Sources',
        layer: 'sources',
        items: [
            { id: 'amplitude-sdk', name: 'Amplitude SDK', icon: 'amplitude' },
            { id: 'segment', name: 'Segment', icon: 'segment-mark' },
            { id: 'tealium', name: 'Tealium', icon: 'tealium' },
            { id: 'api', name: 'HTTP API', icon: 'api' },
            { id: 'cdp', name: 'CDP', icon: 'cdp' },
            { id: 'etl', name: 'ETL', icon: 'etl' },
            { id: 'crm', name: 'CRM', icon: 'crm' }
        ]
    },
    analysis: {
        name: 'Analysis / Warehouse',
        layer: 'analysis',
        items: [
            { id: 'amplitude-analytics', name: 'Amplitude Analytics', icon: 'amplitude' },
            { id: 'snowflake', name: 'Snowflake', icon: 'snowflake' },
            { id: 'bigquery', name: 'BigQuery', icon: 'bigquery' },
            { id: 'databricks', name: 'Databricks', icon: 'databricks' },
            { id: 'bi', name: 'BI', icon: 'search' },
            { id: 's3', name: 'S3', icon: 's3' },
            { id: 'llm', name: 'LLM', icon: 'llm' }
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

export const itemCategoryIndex = {};
Object.entries(categories).forEach(([categoryKey, categoryDef]) => {
    categoryDef.items.forEach(item => {
        itemCategoryIndex[item.id] = categoryKey;
    });
});

export const leftMostPriorityMap = {
    'paid-ads': 0,
    'amplitude-sdk': 0,
    'amplitude-analytics': 0
};

export const SLOT_COLUMNS = 6;
export const DROP_ZONE_HORIZONTAL_PADDING = 48;
export const DROP_ZONE_VERTICAL_PADDING = 64;
export const LAYER_SEQUENCE = ['marketing', 'experiences', 'sources', 'analysis', 'activation'];
export const AMP_ADJACENCY_SOURCE_ID = 'amplitude-sdk';
export const AMP_ADJACENCY_TARGET_IDS = ['segment', 'tealium', 'cdp'];
export const MAX_COLUMN_DELTA_FOR_ADJACENCY = 1;
export const MAX_ROW_DELTA_FOR_ADJACENCY = 0;
export const ADJACENCY_PADDING_X = 12;
export const ADJACENCY_PADDING_Y = 8;
export const HORIZONTAL_PROXIMITY_THRESHOLD = 80;
export const VERTICAL_PROXIMITY_THRESHOLD = 32;

export const icons = {
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
    'ott': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="5" width="18" height="12" rx="2"/>
        <line x1="8" y1="19" x2="16" y2="19"/>
        <line x1="12" y1="17" x2="12" y2="19"/>
        <polygon points="11 10 11 14 15 12 11 10"/>
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
    'call-center': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12a7 7 0 0 1 14 0"/>
        <path d="M5 12v3a2 2 0 0 0 2 2h1"/>
        <path d="M19 12v3a2 2 0 0 1-2 2h-1"/>
        <path d="M9 17v1a2 2 0 0 0 2 2h2"/>
        <circle cx="8" cy="12" r="1"/>
        <circle cx="16" cy="12" r="1"/>
    </svg>`,
    'pos': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="3" width="12" height="18" rx="2"/>
        <rect x="8" y="7" width="8" height="4" rx="1"/>
        <line x1="9" y1="13" x2="11" y2="13"/>
        <line x1="13" y1="13" x2="15" y2="13"/>
        <line x1="9" y1="16" x2="9.01" y2="16"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
        <line x1="15" y1="16" x2="15.01" y2="16"/>
    </svg>`,
    'onboarding': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/>
        <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>`,

    // Data Sources
    'amplitude': `<img src="assets/amplitude.svg" alt="amplitude logo" style="display:block; height:20px; width:auto;" />`,
    'tealium': `<img src="assets/tealium.png" alt="Tealium logo" style="display:block; height:20px; width:auto;" />`,
    'api': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
    </svg>`,
    'etl': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2.5" y="9" width="5" height="6" rx="1"/>
        <path d="M7.5 12h6"/>
        <path d="M11 8l4 4-4 4"/>
        <rect x="15.5" y="7" width="6" height="10" rx="2"/>
    </svg>`,
    'cdp': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="6" cy="12" r="2"/>
        <circle cx="12" cy="6" r="2"/>
        <circle cx="12" cy="18" r="2"/>
        <circle cx="18" cy="12" r="2"/>
        <path d="M7.4 10.6l3.2-3.2"/>
        <path d="M7.4 13.4l3.2 3.2"/>
        <path d="M16.6 10.6l-3.2-3.2"/>
        <path d="M16.6 13.4l-3.2 3.2"/>
        <path d="M8 12h8"/>
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
    'bigquery': `<img src="assets/bq.svg" alt="bq logo" style="display:block; height:20px; width:auto;" />`,
    'snowflake': `<img src="assets/snowflake.png" alt="snowflake logo" style="display:block; height:20px; width:auto;" />`,
    'llm': `<img src="assets/llm.png" alt="llm logo" style="display:block; height:20px; width:auto;" />`,
    'databricks': `<img src="assets/databricks.png" alt="S3 logo" style="display:block; height:20px; width:auto;" />`,
    's3': `<img src="assets/s3.png" alt="S3 logo" style="display:block; height:20px; width:auto;" />`,

    // Activation
    'segment': `<img src="assets/image-7cdc5575-456d-447a-bf0b-5be09cd63492.png" alt="Segment logo" width="20" height="20" style="display:block;" />`,
    'braze': `<img src="assets/braze.png" alt="Braze logo" width="20" height="20" style="display:block;" />`,
    'iterable': `<img src="assets/iterable.png" alt="iterable logo" width="20" height="20" style="display:block;" />`,
    'salesforce': `<img src="assets/salesforce.png" alt="salesforce logo" width="20" height="20" style="display:block;" />`,
    'hubspot': `<img src="assets/hubspot.png" alt="hubspot logo" width="20" height="20" style="display:block;" />`,
    'marketo': `<img src="assets/marketo.webp" alt="marketo logo" width="20" height="20" style="display:block;" />`,
    'intercom': `<img src="assets/intercom.svg" alt="intercom logo" width="20" height="20" style="display:block;" />`,

    // Custom entry icon
    'custom': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>`,
    'segment-mark': `<img src="https://cdn.prod.website-files.com/60a4d4a53dd0c3f45579ac64/60ccab91521f5d2546df4610_5e8db5423d0e429ff92af6d4_segment-logo-FCBB33F58E-seeklogo.com.png" alt="Segment logo" width="20" height="20" style="display:block;" />`
};

export const amplitudeSdkBadgeOptions = [
    { id: 'analytics', label: 'An' },
    { id: 'experiment', label: 'Ex' },
    { id: 'guides-surveys', label: 'GS' },
    { id: 'session-replay', label: 'SR' }
];

export const cdpLikeSourceIds = ['cdp', 'segment', 'tealium'];
export const primaryWarehouseNodeIds = ['bigquery', 'databricks', 'snowflake'];
export const warehouseNodeIds = [...primaryWarehouseNodeIds, 's3'];
export const batchEventTargetIds = new Set(['s3', 'databricks', 'bigquery', 'snowflake']);
export const BATCH_EVENT_LABEL_TEXT = 'Batch events';
export const EVENT_STREAM_LABEL_TEXT = 'Event stream, cohorts';
export const PAID_ADS_LABEL_TEXT = 'Views,\nClicks,\nSpend';
export const MCP_LABEL_TEXT = 'MCP';

export const globalConnectionRules = [
    {
        from: { category: 'marketing' },
        to: { category: 'experiences' },
        exclusions: [
            { targetIds: ['ott', 'call-center', 'pos'] },
            { sourceIds: ['paid-ads'], targetIds: ['web-app', 'mobile-app', 'ott', 'call-center', 'pos'] },
            { sourceIds: ['sms'], targetIds: ['web-app', 'website', 'ott', 'call-center', 'pos'] },
            { sourceIds: ['push-notifications'], targetIds: ['web-app', 'website', 'ott', 'call-center', 'pos'] },
            { sourceIds: ['search', 'referral'], targetIds: ['web-app', 'mobile-app', 'ott', 'call-center', 'pos'] },
            { sourceIds: ['email'], targetIds: ['mobile-app'] }
        ]
    },
    { 
        from: { category: 'experiences' }, 
        to: { ids: ['amplitude-sdk'] },
        exclusions: [
            { sourceIds: ['call-center', 'pos'] }
        ]
    },
    { from: { category: 'experiences' }, to: { ids: cdpLikeSourceIds } },
    { from: { ids: ['amplitude-sdk'] }, to: { ids: ['amplitude-analytics'] } },
    {
        from: { ids: cdpLikeSourceIds },
        to: { category: 'analysis' },
        exclusions: [
            { targetIds: ['bi', 'llm'] }
        ]
    },
    { from: { ids: cdpLikeSourceIds }, to: { category: 'activation' } },
    { from: { ids: ['amplitude-analytics'] }, to: { ids: ['llm'] } },
    { from: { ids: ['amplitude-analytics'] }, to: { ids: primaryWarehouseNodeIds } },
    { from: { ids: ['amplitude-analytics'] }, to: { category: 'activation' } },
    { from: { ids: warehouseNodeIds }, to: { ids: ['bi'] } }
];

export const connectionModels = {
    'amplitude-to-warehouse': {
        name: 'Amplitude → Warehouse',
        rules: []
    },
    'warehouse-to-amplitude': {
        name: 'Warehouse → Amplitude',
        rules: [
            { from: { ids: ['snowflake'] }, to: { ids: ['amplitude-analytics'] } }
        ],
        suppress: [
            { from: { ids: ['amplitude-analytics'] }, to: { ids: ['snowflake'] } }
        ]
    },
    'cdp-in-the-middle': {
        name: 'CDP in the Middle',
        rules: []
    }
};

export const modelAutoConfig = {
    'amplitude-to-warehouse': {
        add: ['amplitude-analytics', 'snowflake', 'amplitude-sdk', 'mobile-app', 'web-app'],
        remove: ['cdp', 'segment', 'tealium', 'etl']
    },
    'warehouse-to-amplitude': {
        add: ['amplitude-analytics', 'snowflake', 'mobile-app', 'etl', 'web-app'],
        remove: ['cdp', 'segment', 'tealium', 'amplitude-sdk']
    },
    'cdp-in-the-middle': {
        add: ['cdp', 'mobile-app', 'web-app', 'amplitude-analytics'],
        remove: ['amplitude-sdk', 'etl']
    }
};

export const SVG_NS = 'http://www.w3.org/2000/svg';
export const CONNECTION_COLOR = 'rgba(100, 116, 139, 0.75)';
