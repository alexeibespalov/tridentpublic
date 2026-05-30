# Trident — Public

Open-source core of [Trident](https://tridentchart.com) — a text-based diagramming tool.

This repo contains the parser, serializer, and read-only renderer. No auth, no collaboration, no dependencies.

---

## What's here

| File | Purpose |
|---|---|
| `parser.js` | Parses Trident markup text → `graphData` object |
| `trident-serializer.js` | Serializes `graphData` → Trident markup text |
| `renderer-oss.js` | Read-only renderer: SVG, PNG, interactive canvas |
| `spec.md` | Full language specification |
| `example.md` | Working diagram examples |
| `demo.html` | Browser demo (open directly, no build step) |

---

## Quick start

```html
<script type="module">
import { Trident2DParserV2 } from './parser.js';
import { renderToSVG, renderToPNG, mountViewer } from './renderer-oss.js';

const parser = new Trident2DParserV2();

const markup = `trident
container backend color:#4A90E2 label:"Backend"
node api[API Server] in backend at (150, 100)
node db[Database]   in backend at (350, 100)
api --> |Query| db`;

// SVG string
const svg = await renderToSVG(markup, parser);

// Interactive canvas with zoom + pan (no editing)
await mountViewer(document.getElementById('diagram'), markup, parser);

// PNG blob (2× retina)
const blob = await renderToPNG(markup, parser, { scale: 2 });
</script>
```

Open `demo.html` directly in a browser to see it running.

---

## Markup format

```
trident

container <id> [color:<hex>] [label:"<text>"] [at (<x>, <y>)]
node <id>(<icon>)[<label>] [in <container>] [at (<x>, <y>)] [color:<hex>]
<source> --> <target>
<source> -->|<label>| <target>
text <id> "<content>" at (<x>, <y>) [style:stickyNote|textBody]
```

See `spec.md` for the full grammar and `example.md` for complete working diagrams.

---

## License

MIT
