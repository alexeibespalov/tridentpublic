// ========== TRIDENT 2D PARSER V2 ==========
// Simplified parser with trait-based elements

export class Trident2DParserV2 {
    constructor() {
        this.containers = new Map();  // Use Container instances
        this.nodes = new Map();       // Use Node instances
        this.edges = [];              // Use Edge instances
        this.nodeCards = new Map();   // nodeId -> markdown string for cards
        this.mermaidBlocks = [];      // Mermaid diagram blocks
        this.annotations = [];        // Text annotations
        this.canvasGraphics = [];     // Canvas graphics (images)
        this.sourceOrder = [];        // Original source ordering hints for serializer roundtrips
        this.errors = [];
        this.lineOffset = 0;
    }

    addError(message, lineIndex) {
        const line = lineIndex + this.lineOffset + 1;
        this.errors.push({
            message,
            line: line
        });
    }

    async parse(diagramText) {
        this.errors = [];

        // Check if this is pure Mermaid markup
        const trimmedText = diagramText.trim();
        const isPureMermaid = this.isPureMermaidDiagram(trimmedText);

        if (isPureMermaid) {
            console.log('Detected pure Mermaid diagram');
            // Set global flag for renderer to know about pure Mermaid mode
            window._isPureMermaidMode = true;
            window._pureMermaidOriginal = diagramText;

            // Process as pure Mermaid
            return await this.parsePureMermaid(diagramText);
        }

        // Reset pure Mermaid mode if not pure Mermaid
        window._isPureMermaidMode = false;

        const lines = diagramText.split('\n');
        let unshifted = false;

        // Auto-add trident header if missing
        if (lines[0] && !lines[0].trim().startsWith('trident')) {
            lines.unshift('trident', '');
            unshifted = true;
        }

        this.lineOffset = unshifted ? -1 : 0;
        if (unshifted) this.lineOffset = -2;

        // Extract lines by type
        const containerLines = [];
        const nodeLines = [];
        const bracketSyntaxNodeLines = [];
        const edgeLines = [];
        const cardLines = [];
        const annotationLines = [];  // Text annotations
        const mermaidBlockLines = [];
        const graphicLines = [];
        const parsedSourceItems = [];

        // Single pass extraction
        let i = 1;
        while (i < lines.length) {
            const line = lines[i]; // Original line
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('%%')) {
                i++;
                continue;
            }

            // 1. Text Annotations & Cards (Multi-line strings)
            // Support both """ (triple quote) and " (single quote) delimiters
            if (trimmed.startsWith('click ') || trimmed.startsWith('text ') || trimmed.startsWith('image ')) {
                let content = trimmed;
                let delimiter = null;
                let firstQuoteIdx = -1;

                // Check for triple quotes first (priority over single)
                if (content.includes('"""')) {
                    delimiter = '"""';
                    firstQuoteIdx = content.indexOf('"""');
                } else if (content.includes('"')) {
                    delimiter = '"';
                    firstQuoteIdx = content.indexOf('"');
                }

                if (delimiter) {
                    // Check for closing delimiter after start
                    // Search from just after the opening delimiter
                    let closingQuoteIdx = content.indexOf(delimiter, firstQuoteIdx + delimiter.length);

                    if (closingQuoteIdx === -1) {
                        // Multi-line mode
                        i++;
                        while (i < lines.length) {
                            const nextLine = lines[i];
                            content += '\n' + nextLine; // Preserve newlines
                            if (nextLine.includes(delimiter)) {
                                break;
                            }
                            i++;
                        }
                    }
                }

                if (trimmed.startsWith('click ')) {
                    cardLines.push({ text: content, index: i });
                } else if (trimmed.startsWith('image ')) {
                    graphicLines.push({ text: content, index: i });
                } else {
                    annotationLines.push({ text: content, index: i });
                }
                i++;
                continue;
            }

            // 2. Mermaid Blocks (Multi-line)
            if (trimmed.startsWith('mermaid ')) {
                let blockContent = trimmed;
                if (!trimmed.includes('{')) {
                    i++;
                    while (i < lines.length && !lines[i].trim().includes('{')) {
                        blockContent += '\n' + lines[i];
                        i++;
                    }
                    if (i < lines.length) {
                        blockContent += '\n' + lines[i];
                    }
                }
                let braceCount = (blockContent.match(/{/g) || []).length - (blockContent.match(/}/g) || []).length;
                if (braceCount > 0) {
                    i++;
                    while (i < lines.length && braceCount > 0) {
                        const nextLine = lines[i];
                        blockContent += '\n' + nextLine;
                        braceCount += (nextLine.match(/{/g) || []).length - (nextLine.match(/}/g) || []).length;
                        i++;
                    }
                }
                mermaidBlockLines.push(blockContent);
                i++;
                continue;
            }

            // 3. Single-line elements
            if (trimmed.startsWith('container ')) {
                containerLines.push({ text: trimmed, index: i });
            } else if (trimmed.startsWith('node ')) {
                nodeLines.push({ text: trimmed, index: i });
            } else if (this.isConnection(trimmed)) {
                edgeLines.push({ text: trimmed, index: i });
            } else if (this.isBracketSyntaxNode(trimmed)) {
                bracketSyntaxNodeLines.push({ text: trimmed, index: i });
            } else if (trimmed.startsWith('image ')) {
                graphicLines.push({ text: trimmed, index: i });
            } else if (trimmed.startsWith('swimlane ')) {
                graphicLines.push({ text: trimmed, index: i });
            } else if (trimmed.startsWith('sequence ')) {
                graphicLines.push({ text: trimmed, index: i });
            }

            i++;
        }

        // Parse in dependency order
        for (const item of containerLines) {
            try {
                const container = this.parseContainer(item.text);
                parsedSourceItems.push({ kind: 'container', id: container.id, index: item.index });
            } catch (e) {
                this.addError(e.message, item.index);
            }
        }

        for (const item of nodeLines) {
            try {
                const node = this.parseNode(item.text);
                parsedSourceItems.push({ kind: 'node', id: node.id, index: item.index });
            } catch (e) {
                this.addError(e.message, item.index);
            }
        }

        // Parse bracket syntax nodes
        for (const item of bracketSyntaxNodeLines) {
            try {
                const node = this.parseBracketSyntaxNode(item.text);
                parsedSourceItems.push({ kind: 'node', id: node.id, index: item.index });
            } catch (e) {
                this.addError(e.message, item.index);
            }
        }

        // Parse Mermaid blocks
        for (const block of mermaidBlockLines) {
            // block stores its own indices internally usually, but we'll try/catch
            try {
                this.parseMermaidBlock(block);
            } catch (e) {
                // Mermaid block start index is harder to get exactly here without tracking,
                // but usually the first line of block is where it starts.
                this.errors.push({ message: e.message });
            }
        }

        for (const item of edgeLines) {
            try {
                const edge = this.parseEdge(item.text);
                parsedSourceItems.push({ kind: 'connection', id: edge.id, index: item.index });
            } catch (e) {
                this.addError(e.message, item.index);
            }
        }

        // Parse cards
        for (const item of cardLines) {
            try {
                const card = this.parseCard(item.text);
                parsedSourceItems.push({ kind: 'card', id: card.id, index: item.index });
            } catch (e) {
                // Multi-line cards index might be start index
                this.errors.push({ message: e.message });
            }
        }

        // Parse text annotations
        for (const item of annotationLines) {
            try {
                const annotation = this.parseAnnotation(item.text);
                parsedSourceItems.push({ kind: 'annotation', id: annotation.id, index: item.index });
            } catch (e) {
                this.errors.push({ message: e.message });
            }
        }

        // Parse canvas graphics and swimlanes
        for (const item of graphicLines) {
            try {
                const lineText = typeof item === 'string' ? item : item.text;
                let graphic;
                if (lineText.startsWith('swimlane ')) {
                    graphic = this.parseSwimlane(lineText);
                } else if (lineText.startsWith('sequence ')) {
                    graphic = this.parseSequence(lineText);
                } else {
                    graphic = this.parseCanvasGraphic(lineText);
                }
                parsedSourceItems.push({ kind: 'graphic', id: graphic.id, index: item.index });
            } catch (e) {
                this.errors.push({ message: e.message });
            }
        }

        this.sourceOrder = parsedSourceItems
            .sort((left, right) => left.index - right.index)
            .map(({ kind, id }) => ({ kind, id }));

        if (this.errors.length > 0) {
            console.error('Parser errors:', this.errors);
            return null;
        }

        // Process Mermaid blocks using layout extractor
        if (this.mermaidBlocks.length > 0 && typeof window.extractMermaidLayout === 'function') {
            console.log(`Processing ${this.mermaidBlocks.length} Mermaid blocks...`);

            for (const block of this.mermaidBlocks) {
                try {
                    const layoutResult = await window.extractMermaidLayout(block.code, {
                        blockId: block.id,
                        baseX: block.x,
                        baseY: block.y,
                        containerId: block.containerId
                    });

                    for (const node of layoutResult.nodes) {
                        this.nodes.set(node.id, node);
                    }

                    for (const link of layoutResult.links) {
                        this.edges.push(link);
                    }

                    if (layoutResult.annotations && layoutResult.annotations.length > 0) {
                        for (const annotation of layoutResult.annotations) {
                            this.annotations.push(annotation);
                        }
                    }
                } catch (error) {
                    console.error(`Error processing Mermaid block ${block.id}:`, error);
                    this.errors.push(`Mermaid block error: ${error.message}`);
                }
            }
        }

        return this.toGraphData();
    }

    parseContainer(line) {
        // container frontend color:#4A90E2 label:"Frontend" at (100, 200)
        const match = line.match(/container\s+([\w-]+)/);
        if (!match) throw new Error('Invalid container syntax');

        const id = match[1];
        const color = line.match(/color:(#[0-9A-Fa-f]{3,6})/)?.[1] || '#E0E0E0';
        const textColor = line.match(/textColor:(#[0-9A-Fa-f]{3,6})/)?.[1];
        const outlineColor = line.match(/outlineColor:(#[0-9A-Fa-f]{3,6})/)?.[1];
        const label = line.match(/label:"([^"]+)"/)?.[1] || id;

        const position = line.match(/at\s+\(([-\d.]+),\s*([-\d.]+)\)/);
        const x = position ? parseFloat(position[1]) : undefined;
        const y = position ? parseFloat(position[2]) : undefined;
        const positioned = !!position;

        const containerWidthMatch = line.match(/width:([\d.]+)/);
        const containerHeightMatch = line.match(/height:([\d.]+)/);
        const containerWidth = containerWidthMatch ? parseFloat(containerWidthMatch[1]) : undefined;
        const containerHeight = containerHeightMatch ? parseFloat(containerHeightMatch[1]) : undefined;

        // Create Container instance with traits
        const container = {
            id,
            color,
            textColor,
            outlineColor,
            label,
            x,
            y,
            positioned,
            width: containerWidth,
            height: containerHeight,
            // Trait properties
            isContainer: true,
            isDraggable: true,
            isSelectable: true,
            isConnectable: true,
            isResizable: true,
            isNestable: true,
            isEditable: true
        };
        this.containers.set(id, container);
        return container;
    }

    parseNode(line) {
        // node webapp(cloud)[Web App] in frontend at (100, 250) color:#FF0000 size:1.5
        let match = line.match(/node\s+([\w-]+)(?:\(([^)]*)\))?\[([^\]]*)\]/);
        let shapeType = 'rectangle';

        if (!match) {
            match = line.match(/node\s+([\w-]+)(?:\(([^)]*)\))?\{([^\}]*)\}/);
            if (match) {
                shapeType = 'diamond';
            } else {
                throw new Error('Invalid node syntax');
            }
        }

        const [, id, icon, rawLabel] = match;
        const label = rawLabel.replace(/<br\s*\/?>/gi, '\n');

        const normalizedIcon = icon && icon.trim().length > 0 ? icon.trim() : undefined;

        // Find properties after the label brackets to avoid matching content inside labels
        const bracketEnd = shapeType === 'rectangle' ? line.lastIndexOf(']') : line.lastIndexOf('}');
        const afterBrackets = bracketEnd >= 0 ? line.substring(bracketEnd + 1) : line;

        const container = afterBrackets.match(/in\s+([\w-]+)/)?.[1];
        const color = afterBrackets.match(/color:(#[0-9A-Fa-f]{3,6})/)?.[1];
        const textColor = afterBrackets.match(/textColor:(#[0-9A-Fa-f]{3,6})/)?.[1];
        const outlineColor = afterBrackets.match(/outlineColor:(#[0-9A-Fa-f]{3,6})/)?.[1];
        const size = afterBrackets.match(/size:([\d.]+)/)?.[1];
        const nodeWidthMatch = afterBrackets.match(/width:([\d.]+)/);
        const nodeHeightMatch = afterBrackets.match(/height:([\d.]+)/);

        const position = afterBrackets.match(/at\s+\(([-\d.]+),\s*([-\d.]+)\)/);
        const x = position ? parseFloat(position[1]) : undefined;
        const y = position ? parseFloat(position[2]) : undefined;
        const positioned = !!position;

        const node = {
            id,
            label,
            icon: normalizedIcon,
            container: container,
            color,
            textColor,
            outlineColor,
            size: size ? parseFloat(size) : undefined,
            width: nodeWidthMatch ? parseFloat(nodeWidthMatch[1]) : undefined,
            height: nodeHeightMatch ? parseFloat(nodeHeightMatch[1]) : undefined,
            shapeType: shapeType,
            x,
            y,
            positioned,
            isDraggable: true,
            isSelectable: true,
            isNestable: true,
            isConnectable: true,
            isEditable: true,
            isResizable: false,
            isContainer: false
        };

        if (container && !this.containers.has(container)) {
            throw new Error(`Container "${container}" not defined`);
        }

        this.nodes.set(id, node);
        return node;
    }

    parseEdge(line) {
        // Regex for a node reference which might include inline definition: id[Label] or id{Label}
        // Also supports Mermaid brackets: (( )), ([ ]), [( )], {{ }}, etc.
        // Group 1: ID, Group 2: opening brackets, Group 3: label content
        const nodeRefPart = '([\\w-]+)(?:(?:(\\(\\(|\\(|\\[\\[|\\[\\(|\\{\\{|\\[|\\{|>|\\/|\\\\)(.+?)(?:\\)\\)|\\)|\\]\\]|\\)\\]|\\}\\}|\\]|\\}|\\/|\\\\)))?(?::::[\\w-]+)?';

        const patterns = [
            // Quoted labels (Mermaid style): node -- "label" --> node
            { re: new RegExp(`^${nodeRefPart}\\s*--\\s*"([^"]*)"\\s*-->\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '-->', type: 'quotes' },
            { re: new RegExp(`^${nodeRefPart}\\s*==\\s*"([^"]*)"\\s*==>\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '==>', type: 'quotes' },
            { re: new RegExp(`^${nodeRefPart}\\s*\\.\\.\\s*"([^"]*)"\\s*\\.->\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '..->', type: 'quotes' },
            { re: new RegExp(`^${nodeRefPart}\\s*\\.->\\s*"([^"]*)"\\s*\\.->\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '.->', type: 'quotes' },
            { re: new RegExp(`^${nodeRefPart}\\s*-\\.-\\s*"([^"]*)"\\s*->\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '-.->', type: 'quotes' },

            // Pipe labels: node --> |label| node
            { re: new RegExp(`^${nodeRefPart}\\s*==>\\s*\\|([^|]*)\\|\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '==>' },
            { re: new RegExp(`^${nodeRefPart}\\s*-->\\s*\\|([^|]*)\\|\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '-->' },
            { re: new RegExp(`^${nodeRefPart}\\s*\\.\\.->\\s*\\|([^|]*)\\|\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '..->' },
            { re: new RegExp(`^${nodeRefPart}\\s*-\\.->\\s*\\|([^|]*)\\|\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '-.->' },
            { re: new RegExp(`^${nodeRefPart}\\s*\\.->\\s*\\|([^|]*)\\|\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '.->' },

            // Embedded labels: node --label--> node
            { re: new RegExp(`^${nodeRefPart}\\s*==([^=]+)==>\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '==>' },
            { re: new RegExp(`^${nodeRefPart}\\s*--([^->]+)-->\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '-->' },
            { re: new RegExp(`^${nodeRefPart}\\s*\\.\\.([^-.]+)\\.\\.->\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '..->' },
            { re: new RegExp(`^${nodeRefPart}\\s*\\.([^.]+)\\.->\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '.->' },
            { re: new RegExp(`^${nodeRefPart}\\s*\\.\\.\\.([^.]+)\\.\\.\\.\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, label: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 }, connector: '...' },

            // No label
            { re: new RegExp(`^${nodeRefPart}\\s*(==>|-->|\\.\\.->|-\\.->|\\.->|==|--|\\.\\.\\.|\\.\\.|-.-)\\s*${nodeRefPart}`), groups: { src: 1, srcBrackets: 2, srcLabel: 3, connector: 4, tgt: 5, tgtBrackets: 6, tgtLabel: 7 } }
        ];

        for (const pattern of patterns) {
            const match = line.match(pattern.re);
            if (!match) continue;

            const g = pattern.groups;
            const sourceId = match[g.src];
            const sourceBrackets = match[g.srcBrackets];
            const sourceLabel = match[g.srcLabel];
            const sourceShape = (sourceBrackets && (sourceBrackets.startsWith('{') || sourceBrackets.startsWith('{{'))) ? 'diamond' : 'rectangle';

            const targetId = match[g.tgt];
            const targetBrackets = match[g.tgtBrackets];
            const targetLabel = match[g.tgtLabel];
            const targetShape = (targetBrackets && (targetBrackets.startsWith('{') || targetBrackets.startsWith('{{'))) ? 'diamond' : 'rectangle';

            const label = g.label ? match[g.label].trim().replace(/<br\s*\/?>/gi, '\n') : undefined;
            const connector = g.connector ? match[g.connector] : pattern.connector;

            // Resolve/Create nodes
            this.resolveNode(sourceId, sourceLabel, sourceShape);
            this.resolveNode(targetId, targetLabel, targetShape);

            // Find properties after the connection part
            const fullMatchText = match[0];
            const afterConnection = line.substring(line.indexOf(fullMatchText) + fullMatchText.length);

            // Validate trailing content: strict check for only whitespace, valid properties, or comments
            // Properties format: key:value
            // Comments format: %% comment
            if (afterConnection && afterConnection.trim().length > 0) {
                // Regex checks if the REST of the line consists only of valid items
                const validValidator = /^(?:\s+|[a-zA-Z0-9_]+:[^:\s]+|%%.*)*$/;
                if (!validValidator.test(afterConnection)) {
                    // If it fails, it means we have garbage (like the "|Metrics|>" part of the bug)
                    // So we treat this match as invalid and continue trying other patterns or throw error
                    // Actually, if we matched a connection but the rest is garbage, it's likely an invalid line
                    // confusingly behaving like a connection.
                    throw new Error(`Invalid edge syntax (trailing characters): "${line}"`);
                }
            }

            const edgeType = this.getEdgeType(connector);

            const edge = {
                id: `connection_${this.edges.length}`,
                source: sourceId,
                target: targetId,
                type: edgeType,
                label,
                isEdge: true,
                isSelectable: true,
                isLabeled: !!label,
                isStylable: true,
                isAnimatable: edgeType.includes('arrow')
            };

            const colorMatch = afterConnection.match(/color:(#[0-9A-Fa-f]{3,6})/);
            if (colorMatch) edge.color = colorMatch[1];

            const routingModeMatch = afterConnection.match(/routingMode:(\w+)/);
            if (routingModeMatch) edge.routingMode = routingModeMatch[1];

            this.edges.push(edge);
            return edge;
        }

        throw new Error('Invalid connection syntax');
    }

    resolveNode(id, label, shapeType) {
        if (this.nodes.has(id)) {
            // Update label only if an explicit (non-default) label is provided
            // This preserves custom labels that were set but not yet saved to markup
            const node = this.nodes.get(id);
            if (label && label !== id) {
                // Only update if the provided label is different from the ID
                // (meaning it's an explicit label, not a default)
                node.label = label.replace(/<br\s*\/?>/gi, '\n');
            }
            // Only update shapeType if it's not 'rectangle' (the default) 
            // OR if it's explicitly provided and different from existing
            if (shapeType && shapeType !== 'rectangle') {
                node.shapeType = shapeType;
            }
            return;
        }

        if (this.containers.has(id)) return;

        // Create new node dynamically
        const node = {
            id,
            label: (label || id).replace(/<br\s*\/?>/gi, '\n'),
            shapeType: shapeType || 'rectangle',
            isDraggable: true,
            isSelectable: true,
            isNestable: true,
            isConnectable: true,
            isEditable: true,
            isResizable: false,
            isContainer: false
        };
        this.nodes.set(id, node);
        return node;
    }

    getEdgeType(connector) {
        if (typeof window !== 'undefined' && window.EdgeStyle && window.EdgeStyle.getType) {
            return window.EdgeStyle.getType(connector);
        }
        const typeMap = {
            '--': 'line',
            '==': 'thick_line',
            '-->': 'arrow',
            '==>': 'thick_arrow',
            '..->': 'dashed_arrow',
            '-.->': 'dashed_arrow',
            '...': 'dashed_line',
            '..': 'dotted_line',
            '.->': 'dotted_arrow',
            '-.-': 'dashed_line'
        };
        return typeMap[connector] || 'line';
    }

    isConnection(line) {
        // Must start with an identifier (word char) — prevents markdown `---`, `##`, prose from matching
        if (!/^\s*\w/.test(line)) return false;
        return /-->|==>|\.\.->|-\.->|\.->|==|--|\.\.|\.\.\.|-.-|\|/.test(line) &&
            !line.startsWith('click ') &&
            !line.startsWith('node ') &&
            !line.startsWith('container ') &&
            !line.startsWith('swimlane ') &&
            !line.startsWith('sequence ');
    }

    isBracketSyntaxNode(line) {
        if (line.startsWith('container ') ||
            line.startsWith('node ') ||
            line.startsWith('click ') ||
            line.startsWith('text ') ||
            line.startsWith('swimlane ') ||
            line.startsWith('sequence ') ||
            this.isConnection(line)) {
            return false;
        }
        const bracketPattern = /^(\w+)[\[\{]([^\]\}]*)[\]\}]/;
        return bracketPattern.test(line);
    }

    parseBracketSyntaxNode(line) {
        let match = line.match(/^(\w+)\[([^\]]*)\]/);
        let bracketShapeType = 'rectangle';

        if (!match) {
            match = line.match(/^(\w+)\{([^\}]*)\}/);
            bracketShapeType = 'diamond';
        }

        if (!match) throw new Error('Invalid bracket syntax node');

        const [, id, labelContent] = match;

        let icon = undefined;
        let label = labelContent;

        const iconMatch = labelContent.match(/^(.+?):\s+(.+)$/u);
        if (iconMatch) {
            icon = iconMatch[1].trim();
            label = iconMatch[2].trim();
        }

        label = label.replace(/<br\s*\/?>/gi, '\n');

        const bracketEnd = bracketShapeType === 'rectangle'
            ? line.indexOf(']')
            : line.indexOf('}');
        const afterBrackets = bracketEnd >= 0 ? line.substring(bracketEnd + 1) : line;
        const container = afterBrackets.match(/in\s+(\w+)/)?.[1];
        const color = afterBrackets.match(/color:(#[0-9A-Fa-f]{3,6})/)?.[1];
        const textColor = afterBrackets.match(/textColor:(#[0-9A-Fa-f]{3,6})/)?.[1];
        const outlineColor = afterBrackets.match(/outlineColor:(#[0-9A-Fa-f]{3,6})/)?.[1];
        const size = afterBrackets.match(/size:([\d.]+)/)?.[1];

        const position = afterBrackets.match(/at\s+\(([-\d.]+),\s*([-\d.]+)\)/);
        const x = position ? parseFloat(position[1]) : undefined;
        const y = position ? parseFloat(position[2]) : undefined;
        const positioned = !!position;

        const node = {
            id,
            label,
            icon,
            container: container,
            color,
            textColor,
            outlineColor,
            size: size ? parseFloat(size) : undefined,
            shapeType: bracketShapeType,
            x,
            y,
            positioned,
            isDraggable: true,
            isSelectable: true,
            isNestable: true,
            isConnectable: true,
            isEditable: true,
            isResizable: false,
            isContainer: false
        };

        if (container && !this.containers.has(container)) {
            throw new Error(`Container "${container}" not defined`);
        }

        this.nodes.set(id, node);
        return node;
    }

    parseCard(line) {
        // click A callback "This is a card for Node A"
        // Also supports triple quotes: click A callback """..."""
        const match = line.match(/click\s+([\w-]+)\s+callback\s+(?:"""([\s\S]*?)"""|"([\s\S]*?)")\s*$/);
        if (!match) throw new Error('Invalid card syntax');

        const nodeId = match[1];
        // Content is in group 2 (triple) or group 3 (single)
        const markdown = match[2] !== undefined ? match[2] : match[3];

        if (!this.nodes.has(nodeId)) {
            throw new Error(`Card references undefined node "${nodeId}"`);
        }

        this.nodeCards.set(nodeId, markdown);
        return { id: nodeId, markdown };
    }
    parseAnnotation(line) {
        // Updated to support multi-line markdown content with [\s\S]+?
        // Supports both """ and "

        // Try new format with ID first
        // Regex handles both triple and single quotes for content
        let match = line.match(/text\s+([\w-]+)\s+(?:"""([\s\S]*?)"""|"([\s\S]*?)")\s+at\s+\(([-\d.]+),\s*([-\d.]+)\)/);
        let textId = null;
        let content, x, y;

        if (match) {
            // New format with ID
            textId = match[1];
            content = match[2] !== undefined ? match[2] : match[3];
            x = match[4];
            y = match[5];
        } else {
            // Try legacy format without ID
            match = line.match(/text\s+(?:"""([\s\S]*?)"""|"([\s\S]*?)")\s+at\s+\(([-\d.]+),\s*([-\d.]+)\)/);
            if (!match) throw new Error('Invalid text annotation syntax');
            content = match[1] !== undefined ? match[1] : match[2];
            x = match[3];
            y = match[4];
        }

        const annotation = {
            id: textId || `text_${this.annotations.length}_${Date.now()}`,
            content,
            x: parseFloat(x),
            y: parseFloat(y),
            positioned: true
        };

        // Find properties after the main annotation definition
        const fullMatchText = match[0];
        const afterAnnotation = line.substring(line.indexOf(fullMatchText) + fullMatchText.length);

        // Parse width for text wrapping bounds
        const widthMatch = afterAnnotation.match(/width:([\d.]+)/);
        if (widthMatch) {
            annotation.width = parseFloat(widthMatch[1]);
        } else {
            annotation.width = 150; // Default width
        }

        // Parse height for manual sizing
        const heightMatch = afterAnnotation.match(/height:([\d.]+)/);
        if (heightMatch) {
            annotation.height = parseFloat(heightMatch[1]);
        }

        // Parse textColor
        const textColorMatch = afterAnnotation.match(/textColor:(#[0-9A-Fa-f]{3,6})/);
        if (textColorMatch) {
            annotation.textColor = textColorMatch[1];
        } else {
            annotation.textColor = '#000000'; // Default text color
        }

        // Parse color (background color)
        const colorMatch = afterAnnotation.match(/(?:\s|^)color:(#[0-9A-Fa-f]{3,6})/);
        if (colorMatch) {
            annotation.color = colorMatch[1];
        }

        // Parse outlineColor (border color)
        const outlineColorMatch = afterAnnotation.match(/outlineColor:(#[0-9A-Fa-f]{3,6})/);
        if (outlineColorMatch) {
            annotation.outlineColor = outlineColorMatch[1];
        }

        // Parse align
        const alignMatch = afterAnnotation.match(/align:(\w+)/);
        if (alignMatch) {
            annotation.align = alignMatch[1];
        }

        // Parse style (sticky note vs regular text body)
        const styleMatch = afterAnnotation.match(/style:(stickyNote|textBody)/);
        if (styleMatch) {
            annotation.style = styleMatch[1];
        } else {
            // Default to sticky notes for backward compatibility with existing diagrams
            annotation.style = 'stickyNote';
        }

        // Parse typography options
        const fontSizeMatch = afterAnnotation.match(/fontSize:([\d.]+)/);
        if (fontSizeMatch) {
            annotation.fontSize = parseFloat(fontSizeMatch[1]);
        }

        const boldMatch = afterAnnotation.match(/bold:(true|false)/);
        if (boldMatch) {
            annotation.bold = boldMatch[1] === 'true';
        }

        const italicMatch = afterAnnotation.match(/italic:(true|false)/);
        if (italicMatch) {
            annotation.italic = italicMatch[1] === 'true';
        }

        const underlineMatch = afterAnnotation.match(/underline:(true|false)/);
        if (underlineMatch) {
            annotation.underline = underlineMatch[1] === 'true';
        }

        const strikethroughMatch = afterAnnotation.match(/strikethrough:(true|false)/);
        if (strikethroughMatch) {
            annotation.strikethrough = strikethroughMatch[1] === 'true';
        }

        this.annotations.push(annotation);
        return annotation;
    }

    parseCanvasGraphic(line) {
        // Parse: image <id> "<url>" at (<x>, <y>) [width:<w>] [height:<h>] [aspectLock:<bool>]
        const match = line.match(/image\s+(\S+)\s+"([^"]+)"\s+at\s+\(([^,]+),\s*([^)]+)\)(.*)/);
        if (!match) throw new Error('Invalid image syntax');

        const [, id, src, x, y, afterCoords] = match;

        const graphic = {
            id,
            src,
            x: parseFloat(x),
            y: parseFloat(y),
            width: 150, // Default width
            height: 150, // Default height
            aspectLock: true, // Default aspectLock
            positioned: true
        };

        // Parse width
        const widthMatch = afterCoords.match(/width:([\d.]+)/);
        if (widthMatch) graphic.width = parseFloat(widthMatch[1]);

        // Parse height
        const heightMatch = afterCoords.match(/height:([\d.]+)/);
        if (heightMatch) graphic.height = parseFloat(heightMatch[1]);

        // Parse aspectLock
        const aspectLockMatch = afterCoords.match(/aspectLock:(\w+)/);
        if (aspectLockMatch) graphic.aspectLock = aspectLockMatch[1] === 'true';

        this.canvasGraphics.push(graphic);
        return graphic;
    }

    parseSwimlane(line) {
        // Parse: swimlane <id> at (<x>, <y>) [width:<w>] [height:<h>] [orientation:<o>] [lanes:<n>] [labels:"..."] [label:"..."]
        const match = line.match(/swimlane\s+(\S+)\s+at\s+\(([^,]+),\s*([^)]+)\)(.*)/);
        if (!match) throw new Error('Invalid swimlane syntax');

        const [, id, x, y, afterCoords] = match;

        const width = parseFloat(afterCoords.match(/width:([\d.]+)/)?.[1] || '800');
        const height = parseFloat(afterCoords.match(/height:([\d.]+)/)?.[1] || '600');
        const orientation = afterCoords.match(/orientation:(\w+)/)?.[1] || 'vertical';
        const lanes = parseInt(afterCoords.match(/lanes:(\d+)/)?.[1] || '4', 10);

        // Extract custom labels
        const labelsMatch = afterCoords.match(/labels:"([^"]*)"/);
        let labels = null;
        if (labelsMatch) {
            labels = labelsMatch[1].split(',').map(l => l.trim());
            while (labels.length < lanes) labels.push(`Lane ${labels.length + 1}`);
            labels = labels.slice(0, lanes);
        }

        // Extract title label (singular "label" — distinct from lane "labels")
        const labelMatch = afterCoords.match(/(?<![s])label:"([^"]*)"/);
        const label = labelMatch ? labelMatch[1].trim() : null;

        // Generate SVG data URI
        let src = '';
        if (typeof window !== 'undefined' && window.SwimlaneManager) {
            src = window.SwimlaneManager.generateSwimlaneSVG(width, height, orientation, lanes, labels, label);
        }

        const graphic = {
            id,
            src,
            x: parseFloat(x),
            y: parseFloat(y),
            width,
            height,
            orientation,
            lanes,
            labels,
            label,
            type: 'swimlane',
            aspectLock: false,
            positioned: true
        };

        this.canvasGraphics.push(graphic);
        return graphic;
    }

    parseSequence(line) {
        // Parse: sequence <id> at (<x>, <y>) [width:<w>] [height:<h>] [participants:"..."]
        const match = line.match(/sequence\s+(\S+)\s+at\s+\(([^,]+),\s*([^)]+)\)(.*)/);
        if (!match) throw new Error('Invalid sequence diagram syntax');

        const [, id, x, y, afterCoords] = match;

        const width = parseFloat(afterCoords.match(/width:([\d.]+)/)?.[1] || '800');
        const height = parseFloat(afterCoords.match(/height:([\d.]+)/)?.[1] || '500');

        // Extract participants from labels string
        const participantsMatch = afterCoords.match(/participants:"([^"]*)"/);
        let labels = null;
        let participants = 3; // default
        if (participantsMatch) {
            labels = participantsMatch[1].split(',').map(l => l.trim());
            participants = labels.length;
        }

        // Generate SVG data URI
        let src = '';
        if (typeof window !== 'undefined' && window.SequenceManager) {
            src = window.SequenceManager.generateSequenceSVG(width, height, participants, labels);
        }

        const graphic = {
            id,
            src,
            x: parseFloat(x),
            y: parseFloat(y),
            width,
            height,
            participants,
            labels,
            type: 'sequence',
            aspectLock: false,
            positioned: true
        };

        this.canvasGraphics.push(graphic);
        return graphic;
    }

    isPureMermaidDiagram(text) {
        const mermaidStartPatterns = [
            /^\s*(graph|flowchart)\s+(TD|TB|BT|LR|RL)/i,
            /^\s*sequenceDiagram/i,
            /^\s*classDiagram/i,
            /^\s*stateDiagram/i,
            /^\s*erDiagram/i,
            /^\s*gantt/i,
            /^\s*pie/i,
            /^\s*journey/i,
            /^\s*gitGraph/i,
            /^\s*mindmap/i,
            /^\s*timeline/i,
            /^\s*quadrantChart/i,
            /^\s*requirementDiagram/i,
            /^\s*C4Context/i
        ];
        return mermaidStartPatterns.some(pattern => pattern.test(text));
    }

    async parsePureMermaid(mermaidCode) {
        const blockId = `mermaid-pure-${Date.now()}`;

        if (typeof window.extractMermaidLayout === 'function') {
            try {
                const layoutResult = await window.extractMermaidLayout(mermaidCode, {
                    blockId: blockId,
                    baseX: 50,
                    baseY: 50,
                    containerId: null
                });

                for (const node of layoutResult.nodes) {
                    this.nodes.set(node.id, node);
                }

                for (const link of layoutResult.links) {
                    this.edges.push(link);
                }

                if (layoutResult.subgraphs) {
                    for (const subgraph of layoutResult.subgraphs) {
                        const container = {
                            id: subgraph.id,
                            label: subgraph.label || subgraph.id,
                            x: subgraph.x || 0,
                            y: subgraph.y || 0,
                            width: subgraph.width || 200,
                            height: subgraph.height || 200,
                            color: 'rgba(255, 255, 255, 0.1)', // Subtle background
                            outlineColor: '#333333',
                            textColor: '#333333',
                            positioned: true,
                            isContainer: true,
                            // Store original node membership for potential future use
                            memberNodes: subgraph.nodes
                        };
                        this.containers.set(container.id, container);
                    }
                }

                console.log(`Pure Mermaid: Added ${layoutResult.nodes.length} nodes, ${layoutResult.links.length} links` +
                    (layoutResult.subgraphs ? `, and ${layoutResult.subgraphs.length} subgraphs` : ''));
            } catch (error) {
                this.errors.push({
                    message: `Mermaid error: ${error.message}`,
                    line: null // Mermaid errors often span multiple lines or don't map cleanly
                });
            }
        }

        return this.toGraphData();
    }

    parseMermaidBlock(blockText) {
        const headerMatch = blockText.match(/mermaid\s+(\w+)\s+at\s+\(([^,]+),\s*([^)]+)\)\s*\{/);
        if (!headerMatch) {
            this.errors.push(`Invalid Mermaid block syntax: ${blockText.substring(0, 50)}...`);
            return;
        }

        const [, containerId, xStr, yStr] = headerMatch;
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);

        const codeStart = blockText.indexOf('{') + 1;
        const codeEnd = blockText.lastIndexOf('}');
        const code = blockText.substring(codeStart, codeEnd).trim();

        const blockId = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        this.mermaidBlocks.push({
            id: blockId,
            containerId: containerId,
            x: x,
            y: y,
            code: code
        });
    }

    toGraphData() {
        const containers = Array.from(this.containers.values()).map(c => ({
            id: c.id,
            label: c.label,
            color: c.color,
            outlineColor: c.outlineColor,
            textColor: c.textColor,
            x: c.x,
            y: c.y,
            positioned: c.positioned,
            width: c.width,
            height: c.height,
            isContainer: true,
            isDraggable: true,
            isSelectable: true,
            isResizable: true,
            isNestable: true,
            isEditable: true
        }));

        const nodes = Array.from(this.nodes.values()).map(node => {
            const nodeWithCard = { ...node };
            if (this.nodeCards.has(node.id)) {
                nodeWithCard.card = this.nodeCards.get(node.id);
            }
            return nodeWithCard;
        });

        const annotations = this.annotations.map(ann => ({
            id: ann.id,
            content: ann.content,
            x: ann.x,
            y: ann.y,
            width: ann.width || 150,
            height: ann.height,
            style: ann.style || 'stickyNote',
            textColor: ann.textColor || '#000000',
            color: ann.color,
            outlineColor: ann.outlineColor,
            align: ann.align || 'left',
            fontSize: ann.fontSize,
            bold: ann.bold,
            italic: ann.italic,
            underline: ann.underline,
            strikethrough: ann.strikethrough,
            positioned: ann.positioned !== undefined ? ann.positioned : true,
            isTextElement: true,
            isDraggable: true,
            isSelectable: true,
            isResizable: true,
            isEditable: true,
            isConnectable: false
        }));

        const canvasGraphics = this.canvasGraphics.map(img => {
            if (typeof global !== 'undefined' && global.window && global.window.createCanvasGraphic) {
                // Use factory if available (for traits)
                return global.window.createCanvasGraphic(img.id, img.src, img);
            }
            return {
                ...img,
                isCanvasGraphic: true,
                isDraggable: true,
                isSelectable: true,
                isResizable: true,
                isEditable: false,
                isConnectable: false,
                isNestable: false
            };
        });

        return {
            containers: containers,
            nodes,
            connections: this.edges,
            annotations: annotations,
            canvasGraphics: canvasGraphics,
            sourceOrder: this.sourceOrder.map(item => ({ ...item })),
            errors: this.errors
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Trident2DParserV2;
    module.exports.Trident2DParser = Trident2DParserV2;
}

if (typeof window !== 'undefined') {
    window.Trident2DParserV2 = Trident2DParserV2;
    window.Trident2DParser = Trident2DParserV2;
}

if (typeof global !== 'undefined') {
    global.Trident2DParserV2 = Trident2DParserV2;
    global.Trident2DParser = Trident2DParserV2;
}