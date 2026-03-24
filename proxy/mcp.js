import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { promisify } from 'util';
import { gzip } from 'zlib';

const gzipAsync = promisify(gzip);

// Mirror of the known item catalog from the frontend config.js
const KNOWN_ITEMS = {
    'paid-ads': 'marketing', 'email': 'marketing', 'sms': 'marketing',
    'push-notifications': 'marketing', 'social-media': 'marketing',
    'search': 'marketing', 'referral': 'marketing',
    'website': 'experiences', 'web-app': 'experiences', 'mobile-app': 'experiences',
    'ott': 'experiences', 'call-center': 'experiences', 'pos': 'experiences',
    'amplitude-sdk': 'sources', 'segment': 'sources', 'tealium': 'sources',
    'api': 'sources', 'cdp': 'sources', 'etl': 'sources', 'crm': 'sources',
    'amplitude-analytics': 'analysis', 'snowflake': 'analysis', 'bigquery': 'analysis',
    'databricks': 'analysis', 'bi': 'analysis', 's3': 'analysis', 'llm': 'analysis',
    'amp-gs': 'activation', 'amp-webexp': 'activation', 'amp-feaexp': 'activation',
    'amp-assistant': 'activation', 'braze': 'activation', 'iterable': 'activation',
    'salesforce': 'activation', 'hubspot': 'activation', 'marketo': 'activation',
    'intercom': 'activation'
};

const VALID_LAYERS = new Set(['marketing', 'experiences', 'sources', 'analysis', 'activation']);

function slugify(value) {
    return (value || '').toString().trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'node';
}

function guessLayerFromKind(kind) {
    const lower = (kind || '').toString().trim().toLowerCase();
    if (!lower) return null;
    if (lower === 'activation') return 'activation';
    if (lower === 'warehouse' || lower === 'analysis') return 'analysis';
    if (lower === 'amplitude') return 'analysis';
    if (lower === 'datasource' || lower === 'source') return 'sources';
    return null;
}

function buildConnectionKey(sourceId, targetId) {
    return [sourceId, targetId].sort().join('::');
}

/**
 * Build a serialized diagram state from the AI response (mirrors frontend applyDiagramFromAi).
 */
function buildDiagramState(aiResult, title) {
    const nodes = Array.isArray(aiResult.diagramNodes) ? aiResult.diagramNodes : [];
    const edges = Array.isArray(aiResult.diagramEdges) ? aiResult.diagramEdges : [];

    const addedItems = { marketing: [], experiences: [], sources: [], analysis: [], activation: [] };
    const customEntries = { marketing: [], experiences: [], sources: [], analysis: [], activation: [] };
    const layerOrder = { marketing: [], experiences: [], sources: [], analysis: [], activation: [] };
    const customConnections = [];
    const itemCategoryIndex = { ...KNOWN_ITEMS };

    for (const node of nodes) {
        const id = node?.id || slugify(node?.label);
        const label = node?.label || id;
        const rawLayer = (node?.layer || '').toString().trim().toLowerCase();
        const normalizedLayer = VALID_LAYERS.has(rawLayer) ? rawLayer : null;
        const kindLayer = guessLayerFromKind(node?.kind);

        // Known catalog item
        if (KNOWN_ITEMS[id]) {
            const category = KNOWN_ITEMS[id];
            if (!addedItems[category].includes(id)) {
                addedItems[category].push(id);
                layerOrder[category].push(id);
            }
            continue;
        }

        // Custom item — resolve layer
        const category = normalizedLayer || kindLayer || 'analysis';
        itemCategoryIndex[id] = category;

        if (!customEntries[category].some(e => e.id === id)) {
            customEntries[category].push({ id, name: label, icon: 'custom', isCustom: true });
        }
        if (!addedItems[category].includes(id)) {
            addedItems[category].push(id);
            layerOrder[category].push(id);
        }
    }

    for (const edge of edges) {
        const sourceId = edge?.sourceId;
        const targetId = edge?.targetId;
        if (!sourceId || !targetId) continue;
        if (!itemCategoryIndex[sourceId] || !itemCategoryIndex[targetId]) continue;
        const key = buildConnectionKey(sourceId, targetId);
        if (!customConnections.includes(key)) {
            customConnections.push(key);
        }
    }

    return {
        version: 1,
        activeCategory: 'marketing',
        activeModel: null,
        diagramTitle: title || 'MCP-generated Diagram',
        lastEditedAt: new Date().toISOString(),
        addedItems,
        customEntries,
        layerOrder,
        customConnections,
        dismissedConnections: [],
        dottedConnections: [],
        connectionAnnotations: {},
        amplitudeSdkSelectedBadges: [],
        nodeNotes: {}
    };
}

async function encodeStateForUrl(state) {
    const json = JSON.stringify(state);
    const compressed = await gzipAsync(Buffer.from(json, 'utf8'));
    // base64url encode
    return compressed.toString('base64url');
}

const SYSTEM_PROMPT = `
You are an Amplitude analytics solutions architect. Given a call transcript, extract architecture-ready details for building a data/activation diagram.

Return ONLY valid JSON with this shape:
{
  "architecture": { "goal": string, "scope": string },
  "events": [
    { "name": string, "properties": [string], "notes": string }
  ],
  "risks": [string],
  "assumptions": [string],
  "diagramNodes": [
    { "id": string, "label": string, "layer": "marketing|experiences|sources|analysis|activation", "kind": "amplitude|warehouse|activation|custom", "notes": string }
  ],
  "diagramEdges": [
    { "sourceId": string, "targetId": string, "label": string }
  ]
}

Rules:
- JSON only; no prose.
- Use best-effort extraction even if partial.
- If there is mention of web site, web app, or mobile app, make sure to add an appropriate node to the "owned experiences" layer.
- if they mention a service or vendor that doesn't exist, you can suggest a new node and guess the most appropriate layer.
- Pay special attention to mention of Amplitude SDK. If they mention Mobile or Web app, assume an AMplitude SDK will be present unless the specifically say otherwise or mention a CDP.
- Prefer concise labels; derive stable ids from names (lowercase, dashes).
- Map AmpliStack layers: marketing, experiences (owned surfaces/apps), sources (ingest), analysis (warehouse/BI/Amplitude), activation (destinations/engagement).
- For diagramEdges, keep labels descriptive (e.g., "track events", "sync audiences").
- If there is a mention of push, email, ads or similar, make sure to add the appropriate node to the "marketing channesl" layer
- If something is unknown, use an empty array or empty string rather than guessing.
`;

/**
 * Mount MCP Streamable HTTP endpoints on an existing Express app.
 */
export function mountMcp(app, { openai, openaiModel, baseUrl }) {
    // Stateless: create a fresh server+transport per request
    function createServer() {
        const server = new McpServer({
            name: 'amplistack',
            version: '1.0.0'
        });

        server.registerTool(
            'create_diagram',
            {
                title: 'Create Diagram',
                description: 'Generate an Amplistack architecture diagram from a text description. Returns a link to the interactive diagram.',
                inputSchema: { description: z.string().describe('A text description of the architecture, customer setup, or call transcript to turn into a diagram') }
            },
            async ({ description }) => {
                if (!openai) {
                    return { content: [{ type: 'text', text: 'Error: OpenAI API key not configured on server.' }] };
                }

                // 1. Call OpenAI
                const completion = await openai.chat.completions.create({
                    model: openaiModel,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: `Transcript:\n${description}` }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.2
                });

                const content = completion.choices?.[0]?.message?.content;
                if (!content) {
                    return { content: [{ type: 'text', text: 'Error: Empty response from AI model.' }] };
                }

                let aiResult;
                try { aiResult = JSON.parse(content); }
                catch { return { content: [{ type: 'text', text: 'Error: Failed to parse AI response as JSON.' }] }; }

                // 2. Build diagram state
                const state = buildDiagramState(aiResult, 'AI-generated Diagram');

                // 3. Encode as URL
                const encoded = await encodeStateForUrl(state);
                const diagramUrl = `${baseUrl}/?state=${encoded}`;

                // 4. Build summary
                const nodeCount = (aiResult.diagramNodes || []).length;
                const edgeCount = (aiResult.diagramEdges || []).length;
                const goal = aiResult.architecture?.goal || '';
                const layers = [...new Set((aiResult.diagramNodes || []).map(n => n.layer).filter(Boolean))];

                const summary = [
                    `Diagram created with ${nodeCount} nodes and ${edgeCount} connections.`,
                    goal ? `\nGoal: ${goal}` : '',
                    layers.length ? `\nLayers used: ${layers.join(', ')}` : '',
                    `\nView diagram: ${diagramUrl}`
                ].join('');

                return {
                    content: [
                        { type: 'text', text: summary }
                    ]
                };
            }
        );

        return server;
    }

    // POST /mcp — main MCP endpoint (stateless)
    app.post('/mcp', async (req, res) => {
        try {
            const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            const server = createServer();
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (error) {
            console.error('MCP request error:', error);
            if (!res.headersSent) {
                res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
            }
        }
    });

    // GET /mcp and DELETE /mcp — not supported in stateless mode
    app.get('/mcp', (req, res) => {
        res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'SSE not supported in stateless mode. Use POST.' }, id: null });
    });

    app.delete('/mcp', (req, res) => {
        res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Session management not supported in stateless mode.' }, id: null });
    });

    console.log('MCP server mounted at /mcp (Streamable HTTP, stateless)');
}
