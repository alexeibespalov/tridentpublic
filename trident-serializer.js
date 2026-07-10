// ========== TRIDENT GRAPH SERIALIZER ==========

const EDGE_TYPE_TO_CONNECTOR = {
    line: '--',
    thick_line: '==',
    arrow: '-->',
    thick_arrow: '==>',
    dashed_arrow: '..->',
    dashed_line: '...',
    dotted_arrow: '.->',
    dotted_line: '..',
    thick: '==>',
    dashed: '..->',
    wave: '~~>'
};

function hasOwnValue(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key) && object[key] !== undefined;
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function formatNumber(value) {
    if (!isFiniteNumber(value)) return '';
    if (Number.isInteger(value)) return String(value);
    return String(parseFloat(value.toFixed(3)));
}

function normalizeMarkupText(value) {
    return String(value ?? '').replace(/\n/g, '<br/>');
}

function quoteText(value) {
    const text = String(value ?? '');
    if (text.includes('\n') || text.includes('"')) {
        return `"""${text}"""`;
    }
    return `"${text}"`;
}

function serializeContainer(container) {
    const parts = [`container ${container.id}`];

    if (container.label) parts.push(`label:"${container.label}"`);
    if (container.color) parts.push(`color:${container.color}`);
    if (container.textColor) parts.push(`textColor:${container.textColor}`);
    if (container.outlineColor) parts.push(`outlineColor:${container.outlineColor}`);
    if (container.positioned && isFiniteNumber(container.x) && isFiniteNumber(container.y)) {
        parts.push(`at (${formatNumber(container.x)}, ${formatNumber(container.y)})`);
    }
    if (isFiniteNumber(container.width)) parts.push(`width:${formatNumber(container.width)}`);
    if (isFiniteNumber(container.height)) parts.push(`height:${formatNumber(container.height)}`);

    return parts.join(' ');
}

function serializeNode(node) {
    const parts = [`node ${node.id}`];
    const bracketOpen = node.shapeType === 'diamond' ? '{' : '[';
    const bracketClose = node.shapeType === 'diamond' ? '}' : ']';
    const label = normalizeMarkupText(node.label != null ? node.label : node.id);

    if (node.icon) {
        parts[0] += `(${node.icon})`;
    }

    parts[0] += `${bracketOpen}${label}${bracketClose}`;

    if (node.container) parts.push(`in ${node.container}`);
    if (node.positioned && isFiniteNumber(node.x) && isFiniteNumber(node.y)) {
        parts.push(`at (${formatNumber(node.x)}, ${formatNumber(node.y)})`);
    }
    if (hasOwnValue(node, 'color')) parts.push(`color:${node.color}`);
    if (hasOwnValue(node, 'textColor')) parts.push(`textColor:${node.textColor}`);
    if (hasOwnValue(node, 'outlineColor')) parts.push(`outlineColor:${node.outlineColor}`);
    if (isFiniteNumber(node.size)) parts.push(`size:${formatNumber(node.size)}`);
    if (isFiniteNumber(node.width)) parts.push(`width:${formatNumber(node.width)}`);
    if (isFiniteNumber(node.height)) parts.push(`height:${formatNumber(node.height)}`);

    return parts.join(' ');
}

function serializeEdge(edge) {
    const connector = EDGE_TYPE_TO_CONNECTOR[edge.type] || '-->';
    const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
    const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
    let line = `${sourceId} ${connector} ${targetId}`;

    if (edge.label && edge.label.trim().length > 0) {
        // Pipe-label syntax: parser uses [^|]* so | in labels would break re-parsing.
        // Replace any pipe characters with a slash to preserve readability.
        const safeLabel = normalizeMarkupText(edge.label).replace(/\|/g, '/');
        line = `${sourceId} ${connector} |${safeLabel}| ${targetId}`;
    }

    if (edge.color) line += ` color:${edge.color}`;
    if (edge.routingMode && edge.routingMode !== 'straight') line += ` routingMode:${edge.routingMode}`;
    // Optional human-set orthogonal ports (drag-authored, editor-only feature).
    if (edge.sourcePort) line += ` sourcePort:${edge.sourcePort}`;
    if (edge.targetPort) line += ` targetPort:${edge.targetPort}`;

    return line;
}

function serializeAnnotation(annotation) {
    const parts = [
        `text ${annotation.id} ${quoteText(annotation.content || '')} at (${formatNumber(annotation.x)}, ${formatNumber(annotation.y)})`
    ];

    if (isFiniteNumber(annotation.width)) parts.push(`width:${formatNumber(annotation.width)}`);
    if (isFiniteNumber(annotation.height)) parts.push(`height:${formatNumber(annotation.height)}`);
    if (annotation.style) parts.push(`style:${annotation.style}`);
    if (annotation.textColor) parts.push(`textColor:${annotation.textColor}`);
    if (annotation.color) parts.push(`color:${annotation.color}`);
    if (annotation.outlineColor) parts.push(`outlineColor:${annotation.outlineColor}`);
    if (annotation.align) parts.push(`align:${annotation.align}`);
    if (isFiniteNumber(annotation.fontSize)) parts.push(`fontSize:${formatNumber(annotation.fontSize)}`);
    if (annotation.bold === true) parts.push('bold:true');
    if (annotation.italic === true) parts.push('italic:true');
    if (annotation.underline === true) parts.push('underline:true');
    if (annotation.strikethrough === true) parts.push('strikethrough:true');

    return parts.join(' ');
}

function serializeCanvasGraphic(graphic) {
    if (graphic.type === 'swimlane') {
        const parts = [
            `swimlane ${graphic.id} at (${formatNumber(graphic.x)}, ${formatNumber(graphic.y)})`
        ];

        if (isFiniteNumber(graphic.width)) parts.push(`width:${formatNumber(graphic.width)}`);
        if (isFiniteNumber(graphic.height)) parts.push(`height:${formatNumber(graphic.height)}`);
        parts.push(`orientation:${graphic.orientation || 'vertical'}`);
        if (Number.isInteger(graphic.lanes)) parts.push(`lanes:${graphic.lanes}`);
        if (Array.isArray(graphic.labels) && graphic.labels.length > 0) parts.push(`labels:"${graphic.labels.join(',')}"`);
        if (graphic.label) parts.push(`label:"${graphic.label}"`);

        return parts.join(' ');
    }

    if (graphic.type === 'sequence') {
        const parts = [
            `sequence ${graphic.id} at (${formatNumber(graphic.x)}, ${formatNumber(graphic.y)})`
        ];

        if (isFiniteNumber(graphic.width)) parts.push(`width:${formatNumber(graphic.width)}`);
        if (isFiniteNumber(graphic.height)) parts.push(`height:${formatNumber(graphic.height)}`);

        if (Array.isArray(graphic.labels) && graphic.labels.length > 0) {
            parts.push(`participants:"${graphic.labels.join(',')}"`);
        }

        return parts.join(' ');
    }

    const parts = [
        `image ${graphic.id} "${graphic.src || ''}" at (${formatNumber(graphic.x)}, ${formatNumber(graphic.y)})`
    ];

    if (isFiniteNumber(graphic.width)) parts.push(`width:${formatNumber(graphic.width)}`);
    if (isFiniteNumber(graphic.height)) parts.push(`height:${formatNumber(graphic.height)}`);
    if (graphic.aspectLock !== undefined) parts.push(`aspectLock:${graphic.aspectLock}`);

    return parts.join(' ');
}

function serializeCard(node) {
    return `click ${node.id} callback ${quoteText(node.card)}`;
}

function appendMissingEntries(orderedEntries, itemsByKind) {
    const seen = new Set(orderedEntries.map(entry => `${entry.kind}:${entry.id}`));

    for (const [kind, items] of Object.entries(itemsByKind)) {
        for (const item of items) {
            const key = `${kind}:${item.id}`;
            if (!seen.has(key)) {
                orderedEntries.push({ kind, id: item.id });
                seen.add(key);
            }
        }
    }

    return orderedEntries;
}

export function serializeGraphData(graphData = {}) {
    const lines = ['trident'];

    const containers = Array.isArray(graphData.containers) ? graphData.containers : [];
    const nodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
    const edges = Array.isArray(graphData.connections) ? graphData.connections : [];
    const annotations = Array.isArray(graphData.annotations) ? graphData.annotations : [];
    const canvasGraphics = Array.isArray(graphData.canvasGraphics) ? graphData.canvasGraphics : [];
    const cards = nodes.filter(node => typeof node.card === 'string' && node.card.length > 0);

    const itemsByKind = {
        container: containers,
        node: nodes,
        connection: edges,
        annotation: annotations,
        graphic: canvasGraphics,
        card: cards
    };

    const serializers = {
        container: serializeContainer,
        node: serializeNode,
        connection: serializeEdge,
        annotation: serializeAnnotation,
        graphic: serializeCanvasGraphic,
        card: serializeCard
    };

    const orderedEntries = appendMissingEntries(
        Array.isArray(graphData.sourceOrder) ? graphData.sourceOrder.map(item => ({ ...item })) : [],
        itemsByKind
    );

    const itemLookups = {
        container: new Map(containers.map(item => [item.id, item])),
        node: new Map(nodes.map(item => [item.id, item])),
        connection: new Map(edges.map(item => [item.id, item])),
        annotation: new Map(annotations.map(item => [item.id, item])),
        graphic: new Map(canvasGraphics.map(item => [item.id, item])),
        card: new Map(cards.map(item => [item.id, item]))
    };

    const orderedLines = [];

    for (const entry of orderedEntries) {
        const item = itemLookups[entry.kind]?.get(entry.id);
        const serializer = serializers[entry.kind];
        if (!item || !serializer) continue;
        orderedLines.push(serializer(item));
    }

    if (orderedLines.length > 0) {
        lines.push('');
        lines.push(...orderedLines);
    }

    return lines.join('\n');
}

export const TridentGraphSerializer = {
    serializeGraphData
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        serializeGraphData,
        TridentGraphSerializer
    };
}

if (typeof window !== 'undefined') {
    window.serializeGraphData = serializeGraphData;
    window.TridentGraphSerializer = TridentGraphSerializer;
}

if (typeof global !== 'undefined') {
    global.serializeGraphData = serializeGraphData;
    global.TridentGraphSerializer = TridentGraphSerializer;
}