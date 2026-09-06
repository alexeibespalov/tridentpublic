// renderer-oss.js — Trident read-only diagram renderer (OSS)
// Input: Trident markup text → parser.js graphData → SVG / Canvas / PNG
// No dependencies beyond parser.js. No mutation, no editing, no collab.

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const DEFAULT_NODE_W = 120;
const DEFAULT_NODE_H = 40;
const CONTAINER_PADDING = 40;
const CONTAINER_LABEL_H = 24;
const GRID_SPACING_X = 160;
const GRID_SPACING_Y = 90;
const DIAGRAM_PADDING = 48;

const CONTAINER_FILLS = [
  '#E3F2FD', '#F3E5F5', '#E8F5E9', '#FFF3E0',
  '#FCE4EC', '#E0F7FA', '#F9FBE7', '#EDE7F6',
];
const CONTAINER_STROKE  = '#9E9E9E';
const NODE_FILL         = '#FFFFFF';
const NODE_STROKE       = '#90A4AE';
const CONN_COLOR        = '#607D8B';
const TEXT_DARK         = '#212121';
const TEXT_MID          = '#546E7A';
const BG_FILL           = '#FAFAFA';
const ANNO_STICKY_FILL  = '#FFF9C4';
const ANNO_STICKY_STROKE = '#FFD700';
const ANNO_BODY_STROKE  = '#CCCCCC';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Truncate string to fit within maxPx (rough: ~7px per char). */
function clip(s, maxPx) {
  const maxCh = Math.max(1, Math.floor(maxPx / 7));
  return s.length <= maxCh ? s : s.slice(0, maxCh - 1) + '…';
}

/** Assign grid positions to nodes that have no x/y. */
function autoLayout(nodes) {
  const unpos = nodes.filter(n => n.x == null || n.y == null);
  if (unpos.length === 0) return;
  const cols = Math.max(1, Math.ceil(Math.sqrt(unpos.length)));
  unpos.forEach((n, i) => {
    n.x = 100 + (i % cols) * GRID_SPACING_X;
    n.y = 100 + Math.floor(i / cols) * GRID_SPACING_Y;
  });
}

/** Bounding rect of all nodes belonging to a container (world coords). */
function containerChildBounds(containerId, nodes) {
  const kids = nodes.filter(n => String(n.container ?? '') === containerId && !n.isContainer);
  if (kids.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of kids) {
    const w = n.width ?? DEFAULT_NODE_W;
    const h = n.height ?? DEFAULT_NODE_H;
    minX = Math.min(minX, n.x - w / 2);
    minY = Math.min(minY, n.y - h / 2);
    maxX = Math.max(maxX, n.x + w / 2);
    maxY = Math.max(maxY, n.y + h / 2);
  }
  return {
    x: minX - CONTAINER_PADDING,
    y: minY - CONTAINER_PADDING - CONTAINER_LABEL_H,
    w: (maxX - minX) + CONTAINER_PADDING * 2,
    h: (maxY - minY) + CONTAINER_PADDING * 2 + CONTAINER_LABEL_H,
  };
}

/** Center point of a node or container for connection routing. */
function entityCenter(id, nodes, containerRects) {
  const node = nodes.find(n => n.id === id && !n.isContainer);
  if (node) return { x: node.x ?? 0, y: node.y ?? 0 };
  const rect = containerRects.get(id);
  if (rect) return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  return null;
}

// ---------------------------------------------------------------------------
// Core SVG generator — takes parser.js graphData, returns SVG string
// ---------------------------------------------------------------------------

function generateDiagramSvg(graphData) {
  const nodes = (graphData.nodes ?? [])
    .filter(n => !n.isContainer)
    .map(n => ({ ...n }));
  const containers  = graphData.containers  ?? [];
  const connections = graphData.connections ?? [];
  const annotations = graphData.annotations ?? [];

  autoLayout(nodes);

  // Build container bounding rects from child node positions
  const containerRects = new Map();
  for (const c of containers) {
    const bounds = containerChildBounds(c.id, nodes);
    if (bounds) containerRects.set(c.id, bounds);
  }

  // Global bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const [, r] of containerRects) {
    minX = Math.min(minX, r.x);        minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);  maxY = Math.max(maxY, r.y + r.h);
  }
  for (const n of nodes) {
    const w = n.width ?? DEFAULT_NODE_W, h = n.height ?? DEFAULT_NODE_H;
    minX = Math.min(minX, n.x - w / 2);  minY = Math.min(minY, n.y - h / 2);
    maxX = Math.max(maxX, n.x + w / 2);  maxY = Math.max(maxY, n.y + h / 2);
  }
  for (const a of annotations) {
    minX = Math.min(minX, a.x ?? 0);
    minY = Math.min(minY, a.y ?? 0);
    maxX = Math.max(maxX, (a.x ?? 0) + (a.width  ?? 150));
    maxY = Math.max(maxY, (a.y ?? 0) + (a.height ?? 80));
  }

  // Place orphan containers (no children) to the right of everything else
  let orphanOffsetX = isFinite(maxX) ? maxX + 60 : 60;
  for (const c of containers) {
    if (!containerRects.has(c.id)) {
      const r = { x: orphanOffsetX, y: isFinite(minY) ? minY : 0, w: 180, h: 100 };
      containerRects.set(c.id, r);
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
      orphanOffsetX += 200;
    }
  }

  if (!isFinite(minX)) {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">',
      `<rect width="400" height="200" fill="${BG_FILL}"/>`,
      `<text x="200" y="108" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="15" fill="#9E9E9E">Empty diagram</text>`,
      '</svg>',
    ].join('\n');
  }

  const vx = minX - DIAGRAM_PADDING, vy = minY - DIAGRAM_PADDING;
  const vw = (maxX - minX) + DIAGRAM_PADDING * 2;
  const vh = (maxY - minY) + DIAGRAM_PADDING * 2;
  const MAX_DIM = 1800;
  const scale = Math.min(1, MAX_DIM / Math.max(vw, vh, 1));
  const svgW = Math.round(vw * scale), svgH = Math.round(vh * scale);

  const parts = [];

  // Background
  parts.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${BG_FILL}"/>`);

  // Arrow marker definition
  parts.push(
    '<defs>',
    `  <marker id="arr" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">`,
    `    <path d="M0,0 L0,7 L9,3.5 z" fill="${CONN_COLOR}"/>`,
    '  </marker>',
    '</defs>',
  );

  // --- Containers ---
  containers.forEach((c, i) => {
    const r = containerRects.get(c.id);
    const fill   = c.color ? c.color + '99' : CONTAINER_FILLS[i % CONTAINER_FILLS.length];
    const stroke = c.outlineColor ?? c.color ?? CONTAINER_STROKE;
    const label  = esc(clip(String(c.label ?? c.id ?? ''), r.w - 20));
    parts.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
      `<text x="${r.x + 12}" y="${r.y + CONTAINER_LABEL_H - 6}" font-family="'Segoe UI',Arial,sans-serif" font-size="13" font-weight="600" fill="${c.textColor ?? TEXT_DARK}">${label}</text>`,
    );
  });

  // --- Connections ---
  for (const conn of connections) {
    const srcId = conn.source?.id ?? conn.source;
    const dstId = conn.target?.id ?? conn.target;
    const src = entityCenter(srcId, nodes, containerRects);
    const dst = entityCenter(dstId, nodes, containerRects);
    if (!src || !dst) continue;

    const lbl         = conn.label ? esc(clip(String(conn.label), 80)) : '';
    const mx          = (src.x + dst.x) / 2, my = (src.y + dst.y) / 2;
    const strokeColor = conn.color ?? CONN_COLOR;
    const isDashed    = conn.type?.includes('dashed') || conn.type?.includes('dotted');
    const dashAttr    = isDashed ? ' stroke-dasharray="6,3"' : '';
    const isLineOnly  = conn.type?.includes('line') && !conn.type?.includes('arrow');
    const markerAttr  = isLineOnly ? '' : ' marker-end="url(#arr)"';
    // Wave (~~>) and bezier-routed edges render as a smooth curve rather than a
    // straight segment so the style reads distinctly in the static renderer.
    const isCurved    = conn.type?.includes('wave') || conn.routingMode === 'bezier';

    if (isCurved) {
      const dx = dst.x - src.x, dy = dst.y - src.y;
      const len = Math.hypot(dx, dy) || 1;
      const off = Math.min(60, len * 0.2); // perpendicular arc height
      const cxp = mx + (-dy / len) * off;
      const cyp = my + (dx / len) * off;
      parts.push(
        `<path d="M${src.x},${src.y} Q${cxp},${cyp} ${dst.x},${dst.y}" fill="none" stroke="${strokeColor}" stroke-width="1.5"${dashAttr}${markerAttr}/>`,
      );
    } else {
      parts.push(
        `<line x1="${src.x}" y1="${src.y}" x2="${dst.x}" y2="${dst.y}" stroke="${strokeColor}" stroke-width="1.5"${dashAttr}${markerAttr}/>`,
      );
    }
    if (lbl) {
      parts.push(
        `<text x="${mx}" y="${my - 5}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${TEXT_MID}">${lbl}</text>`,
      );
    }
  }

  // --- Nodes ---
  for (const n of nodes) {
    const w      = n.width  ?? DEFAULT_NODE_W;
    const h      = n.height ?? DEFAULT_NODE_H;
    const fill   = n.color        ?? NODE_FILL;
    const stroke = n.outlineColor ?? NODE_STROKE;
    const textColor = n.textColor ?? TEXT_DARK;
    const shapeType = String(n.shapeType || 'rectangle').toLowerCase();
    const cx = n.x, cy = n.y, hw = w / 2, hh = h / 2;

    const isBpmnEventOrGateway = shapeType.startsWith('bpmn-') && (shapeType.includes('event') || shapeType.includes('gateway'));
    const labelY = isBpmnEventOrGateway ? (cy + hh + 14) : (cy + 4);
    const label  = esc(clip(String(n.label ?? n.id ?? ''), isBpmnEventOrGateway ? 120 : (w - 12)));

    // Diamond / Rhombus
    if (shapeType === 'diamond' || shapeType === 'flowchart-decision' || shapeType.startsWith('bpmn-gateway') || shapeType.startsWith('uml-decision') || shapeType === 'uml-junction' || shapeType === 'uml-choice') {
      parts.push(
        `<polygon points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${labelY}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${textColor}">${label}</text>`,
      );
    }
    // Double Circle
    else if (shapeType === 'flowchart-double-circle' || shapeType === 'bpmn-end-event' || shapeType === 'bpmn-terminate-event' || shapeType === 'uml-final-state' || shapeType === 'uml-flow-final') {
      parts.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${hw}" ry="${hh}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(2, hw - 4)}" ry="${Math.max(2, hh - 4)}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${labelY}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${textColor}">${label}</text>`,
      );
    }
    // Circle / Ellipse
    else if (shapeType === 'circle' || shapeType === 'ellipse' || shapeType === 'flowchart-circle' || shapeType.startsWith('bpmn-') && shapeType.includes('event') || shapeType.startsWith('uml-') && (shapeType.includes('state') || shapeType.includes('point') || shapeType.includes('socket')) || shapeType === 'drop' || shapeType === 'organic-bubble') {
      parts.push(
        `<ellipse cx="${cx}" cy="${cy}" rx="${hw}" ry="${hh}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${labelY}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${textColor}">${label}</text>`,
      );
    }
    // Cylinder
    else if (shapeType === 'cylinder' || shapeType.startsWith('flowchart-cylinder') || shapeType.includes('storage') || shapeType === 'bpmn-data-store' || shapeType === 'uml-database' || shapeType === 'uml-datastore') {
      const capH = Math.min(12, hh * 0.5);
      parts.push(
        `<path d="M${cx - hw},${cy - hh + capH} L${cx - hw},${cy + hh - capH} A${hw},${capH} 0 0,0 ${cx + hw},${cy + hh - capH} L${cx + hw},${cy - hh + capH} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<ellipse cx="${cx}" cy="${cy - hh + capH}" rx="${hw}" ry="${capH}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${textColor}">${label}</text>`,
      );
    }
    // Stadium
    else if (shapeType === 'stadium' || shapeType === 'flowchart-stadium' || shapeType === 'flowchart-loop-limit') {
      parts.push(
        `<rect x="${cx - hw}" y="${cy - hh}" width="${w}" height="${h}" rx="${hh}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="12" fill="${textColor}">${label}</text>`,
      );
    }
    // Subroutine
    else if (shapeType === 'flowchart-subroutine' || shapeType === 'bpmn-subprocess' || shapeType === 'bpmn-call-activity' || shapeType === 'uml-component') {
      parts.push(
        `<rect x="${cx - hw}" y="${cy - hh}" width="${w}" height="${h}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<line x1="${cx - hw + 8}" y1="${cy - hh}" x2="${cx - hw + 8}" y2="${cy + hh}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<line x1="${cx + hw - 8}" y1="${cy - hh}" x2="${cx + hw - 8}" y2="${cy + hh}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="12" fill="${textColor}">${label}</text>`,
      );
    }
    // Hexagon
    else if (shapeType === 'hexagon' || shapeType === 'flowchart-hexagon' || shapeType === 'octagon') {
      const indent = hh * 0.5;
      parts.push(
        `<polygon points="${cx - hw + indent},${cy - hh} ${cx + hw - indent},${cy - hh} ${cx + hw},${cy} ${cx + hw - indent},${cy + hh} ${cx - hw + indent},${cy + hh} ${cx - hw},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${textColor}">${label}</text>`,
      );
    }
    // Parallelogram
    else if (shapeType === 'parallelogram' || shapeType === 'flowchart-parallelogram' || shapeType === 'flowchart-manual-input') {
      const skew = Math.min(16, hw * 0.3);
      parts.push(
        `<polygon points="${cx - hw + skew},${cy - hh} ${cx + hw},${cy - hh} ${cx + hw - skew},${cy + hh} ${cx - hw},${cy + hh}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${textColor}">${label}</text>`,
      );
    }
    // Parallelogram Alt
    else if (shapeType === 'flowchart-parallelogram-alt') {
      const skew = Math.min(16, hw * 0.3);
      parts.push(
        `<polygon points="${cx - hw},${cy - hh} ${cx + hw - skew},${cy - hh} ${cx + hw},${cy + hh} ${cx - hw + skew},${cy + hh}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${textColor}">${label}</text>`,
      );
    }
    // Trapezoid
    else if (shapeType === 'trapezoid' || shapeType === 'flowchart-trapezoid') {
      const inset = Math.min(16, hw * 0.25);
      parts.push(
        `<polygon points="${cx - hw + inset},${cy - hh} ${cx + hw - inset},${cy - hh} ${cx + hw},${cy + hh} ${cx - hw},${cy + hh}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${textColor}">${label}</text>`,
      );
    }
    // Inverted Trapezoid
    else if (shapeType === 'flowchart-inv-trapezoid') {
      const inset = Math.min(16, hw * 0.25);
      parts.push(
        `<polygon points="${cx - hw},${cy - hh} ${cx + hw},${cy - hh} ${cx + hw - inset},${cy + hh} ${cx - hw + inset},${cy + hh}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="11" fill="${textColor}">${label}</text>`,
      );
    }
    // Rounded-rect / BPMN Task / UML Action / State
    else if (shapeType === 'rounded-rect' || shapeType === 'flowchart-rounded' || shapeType.startsWith('bpmn-task') || shapeType.endsWith('-task') || shapeType.startsWith('uml-action') || shapeType === 'uml-state' || shapeType === 'uml-use-case') {
      parts.push(
        `<rect x="${cx - hw}" y="${cy - hh}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="12" fill="${textColor}">${label}</text>`,
      );
    }
    // Default Rectangle
    else {
      parts.push(
        `<rect x="${cx - hw}" y="${cy - hh}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Segoe UI',Arial,sans-serif" font-size="12" fill="${textColor}">${label}</text>`,
      );
    }
  }

  // --- Annotations (rendered above nodes) ---
  for (const a of annotations) {
    const ax = a.x ?? 0, ay = a.y ?? 0;
    const aw = a.width  ?? 150, ah = a.height ?? 80;
    const isSticky   = a.style === 'stickyNote';
    const fill       = a.color       ?? (isSticky ? ANNO_STICKY_FILL   : 'none');
    const stroke     = a.outlineColor ?? (isSticky ? ANNO_STICKY_STROKE : ANNO_BODY_STROKE);
    const textColor  = a.textColor   ?? TEXT_DARK;
    const fontSize   = a.fontSize    ?? 11;
    const fontWeight = a.bold   ? 'bold'   : 'normal';
    const fontStyle  = a.italic ? 'italic' : 'normal';

    parts.push(`<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`);

    const lines = String(a.content ?? '').split('\n').slice(0, 8);
    lines.forEach((line, idx) => {
      const clipped = esc(clip(line, aw - 12));
      parts.push(
        `<text x="${ax + 6}" y="${ay + fontSize + 4 + idx * (fontSize + 3)}" ` +
        `font-family="'Segoe UI',Arial,sans-serif" font-size="${fontSize}" ` +
        `font-weight="${fontWeight}" font-style="${fontStyle}" fill="${textColor}">${clipped}</text>`,
      );
    });
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg width="${svgW}" height="${svgH}" viewBox="${vx} ${vy} ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg">`,
    ...parts,
    '</svg>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render Trident markup to an SVG string.
 * @param {string} markupText - Trident DSL text
 * @param {object} parser     - TridentParserV2 instance from parser.js
 * @returns {Promise<string>} SVG string
 */
async function renderToSVG(markupText, parser) {
  const graphData = await parser.parse(markupText);
  return generateDiagramSvg(graphData);
}

/**
 * Render Trident markup to a PNG Blob (browser only).
 * @param {string} markupText
 * @param {object} parser     - TridentParserV2 instance from parser.js
 * @param {object} [opts]
 * @param {number} [opts.scale=2] - Pixel density multiplier (2 = retina)
 * @returns {Promise<Blob>}
 */
async function renderToPNG(markupText, parser, opts = {}) {
  const svgString = await renderToSVG(markupText, parser);
  const scale = opts.scale ?? 2;
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth  * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')); };
    img.src = url;
  });
}

/**
 * Mount a read-only interactive canvas viewer inside containerEl (browser only).
 * Supports zoom (scroll wheel) and pan (drag). No selection, editing, or mutation.
 * @param {HTMLElement} containerEl - Must have explicit width/height (e.g. style="width:800px;height:600px")
 * @param {string} markupText
 * @param {object} parser - TridentParserV2 instance from parser.js
 * @returns {Promise<{canvas: HTMLCanvasElement, redraw: function}>}
 */
async function mountViewer(containerEl, markupText, parser) {
  const svgString = await renderToSVG(markupText, parser);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:grab';
  containerEl.appendChild(canvas);

  let tx = 0, ty = 0, zoom = 1;
  let dragging = false, lastX = 0, lastY = 0;

  function draw() {
    const w = canvas.width  = containerEl.clientWidth;
    const h = canvas.height = containerEl.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(zoom, zoom);
    if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  img.onload = () => {
    const cw = containerEl.clientWidth, ch = containerEl.clientHeight;
    zoom = Math.min(cw / img.naturalWidth, ch / img.naturalHeight, 1);
    tx = (cw - img.naturalWidth  * zoom) / 2;
    ty = (ch - img.naturalHeight * zoom) / 2;
    draw();
    URL.revokeObjectURL(url);
  };
  img.src = url;

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    tx = mx - (mx - tx) * factor;
    ty = my - (my - ty) * factor;
    zoom *= factor;
    draw();
  }, { passive: false });

  canvas.addEventListener('mousedown', e => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('mousemove', e => {
    if (!dragging) return;
    tx += e.clientX - lastX; ty += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    draw();
  });
  const stopDrag = () => { dragging = false; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('mouseup', stopDrag);
  canvas.addEventListener('mouseleave', stopDrag);

  return { canvas, redraw: draw };
}

// ---------------------------------------------------------------------------
// Exports — ESM, CommonJS, and browser global
// ---------------------------------------------------------------------------

export { renderToSVG, renderToPNG, mountViewer, generateDiagramSvg };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderToSVG, renderToPNG, mountViewer, generateDiagramSvg };
}

if (typeof window !== 'undefined') {
  window.TridentRenderer = { renderToSVG, renderToPNG, mountViewer, generateDiagramSvg };
}
