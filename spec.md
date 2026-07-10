# Trident 2D Architecture Diagram Specification v2.0

## Overview

Trident is a text-based language for creating 2D architecture diagrams with explicit positioning. Trident gives you precise control over node placement while maintaining a clean, readable syntax.

**Key Features:**
- Explicit (x, y) positioning for predictable layouts
- Container-based visual organization
- 3,400+ built-in icons via fuzzy matching (tech stacks, cloud services, FontAwesome, emoji)
- AI-friendly syntax for LLM generation
- Version-controllable (Git-friendly)
- Flexible connection labels

---

## Quick Example

```trident
%% Three-tier web architecture

container frontend color:#4A90E2 label:"Frontend"
container backend color:#E74C3C label:"Backend"
container data color:#27AE60 label:"Data"

node webapp(cloud)[Web App] in frontend at (100, 250)
node mobile(mobile)[Mobile App] in frontend at (200, 250)

node api(server)[API Gateway] in backend at (150, 150)
node cache(cache)[Redis Cache] in backend at (250, 150)

node db(database)[PostgreSQL] in data at (150, 50)

webapp --HTTPS--> api
mobile --HTTPS--> api
api --Query--> db
api --Cache--> cache
```

---

## Grammar Specification

### EBNF Grammar

```ebnf
(* Root *)
diagram ::= "trident" ( container_def | node_def | bracket_node_def | connection_def | card_def | text_def | image_def | swimlane_def | sequence_def | comment )*

(* Container Definition - Visual grouping with color/label *)
container_def ::= "container" identifier ( container_property )* newline

container_property ::= "color:" color_value
                     | "textColor:" color_value
                     | "outlineColor:" color_value
                     | "label:" string
                     | "at" "(" number "," number ")"

(* Node Definition - Full Trident syntax *)
node_def ::= "node" identifier icon_spec label_spec position_spec ( node_property )* newline

icon_spec ::= "(" identifier ")"
label_spec ::= "[" text "]"

position_spec ::= container_position | absolute_position | auto_position

container_position ::= "in" identifier "at" "(" number "," number ")"
absolute_position ::= "at" "(" number "," number ")"
auto_position ::= "in" identifier

node_property ::= "color:" color_value
                | "textColor:" color_value
                | "outlineColor:" color_value
                | "size:" number

(* Bracket-style Node Definition - Simplified syntax *)
(* Supports two formats: simple label or icon:label *)
bracket_node_def ::= identifier label_spec ( position_spec )? ( node_property )* newline

label_spec ::= "[" text "]"                    (* Simple: [Node Label] *)
             | "[" identifier ":" text "]"     (* With icon: [server: Node Label] *)

(* Connection Definition - supports both pipe and embedded label syntax *)
connection_def ::= node_ref connector node_ref ( connection_property )* newline

(* Connectors support TWO label syntaxes: pipe and embedded *)
connector ::= labeled_connector | unlabeled_connector

(* Pipe syntax: -->|Label| ==>|Label| ..->|Label| ~~>|Label| *)
labeled_connector ::= unlabeled_connector "|" label_text "|"

(* Embedded syntax: --Label--> ==Label==> ..Label..-> *)
                    | "--" label_text "-->"
                    | "==" label_text "==>"
                    | ".." label_text "..->"
                    | "..." label_text "..."
                    | "." label_text ".->"

unlabeled_connector ::= "--"      (* basic line *)
                      | "=="      (* thick line *)
                      | "-->"     (* arrow *)
                      | "==>"     (* thick arrow *)
                      | "..->"    (* dashed arrow *)
                      | ".->"     (* dotted arrow *)
                      | "~~>"     (* wave arrow (organic / flowing, bezier-routed) *)
                      | "..."     (* dashed line *)
                      | ".."      (* dotted line *)

connection_property ::= "color:" color_value
                      | "style:" identifier
                      | "routingMode:" routing_mode

routing_mode ::= "straight" | "bezier" | "orthogonal"

node_ref ::= identifier

(* Card Definition - click callbacks for tooltips *)
card_def ::= "click" identifier "callback" string newline

(* Text Annotation - Floating text box *)
text_def ::= "text" identifier? string "at" "(" number "," number ")" ( text_property )* newline
           | "text" identifier? '"""' text '"""' "at" "(" number "," number ")" ( text_property )* newline

text_property ::= "width:" number
                | "height:" number
                | "textColor:" color_value
                | "align:" ( "left" | "center" | "right" )
                | "color:" color_value
                | "outlineColor:" color_value
                | "style:" ( "stickyNote" | "textBody" )
                | "fontSize:" number
                | "bold:" boolean
                | "italic:" boolean
                | "underline:" boolean
                | "strikethrough:" boolean

(* Image - Embedded image at a canvas position *)
image_def ::= "image" identifier string "at" "(" number "," number ")" ( image_property )* newline

image_property ::= "width:" number
                 | "height:" number
                 | "aspectLock:" boolean

(* Swimlane - Structured background with labeled lanes *)
swimlane_def ::= "swimlane" identifier "at" "(" number "," number ")" ( swimlane_property )* newline

swimlane_property ::= "width:" number
                    | "height:" number
                    | "orientation:" ( "vertical" | "horizontal" )
                    | "lanes:" integer
                    | "labels:" string
                    | "label:" string

(* Sequence Diagram - Participant boxes with lifelines *)
sequence_def ::= "sequence" identifier "at" "(" number "," number ")" ( sequence_property )* newline

sequence_property ::= "width:" number
                    | "height:" number
                    | "participants:" string

boolean ::= "true" | "false"
integer ::= digit+

(* Comment *)
comment ::= "%%" text newline

(* Primitives *)
identifier ::= letter ( letter | digit | "_" | "-" )*
number ::= [ "-" ] digit+ [ "." digit+ ]
color_value ::= "#" hex_digit{6} | "#" hex_digit{3}
string ::= '"' ( any character except '"' | '\"' )* '"'
label_text ::= text without newline or delimiter characters
text ::= any character except newline
letter ::= "a".."z" | "A".."Z"
digit ::= "0".."9"
hex_digit ::= "0".."9" | "a".."f" | "A".."F"
```

---

## Core Concepts

### 1. Coordinate System

**Trident uses screen coordinates:**
- **X-axis**: Increases from left to right
- **Y-axis**: Increases from top to bottom (downward)
- **Origin (0, 0)**: Top-left corner

This matches standard screen/canvas coordinate systems and makes positioning intuitive for UI layouts.

**Example:**
```trident
node top[Top Node] at (100, 50)      %% Near top of diagram
node middle[Middle] at (100, 150)    %% Below top node
node bottom[Bottom] at (100, 250)    %% Below middle node
```

---

### 2. Containers (Visual Organization)

Containers are **visual groupings** for organizing nodes into categories.

**Purpose:**
- Group related components (e.g., "Frontend", "Backend", "Data")
- Apply color-coded backgrounds or zones
- Toggle visibility in UI (show/hide containers)
- Organize diagram semantically

**NOT spatial depth** - just organizational categories.

**Syntax:**
```
container <id> color:<hex> label:"<text>" at (<x>, <y>)
```

**Example:**
```trident
container ui color:#4A90E2 label:"User Interface" at (100, 50)
container services color:#E74C3C label:"Services" at (300, 150)
container storage color:#27AE60 label:"Storage" at (500, 250)
```

**Properties:**
- `color:#RRGGBB` - Background color for the container zone (hex format)
- `label:"Text"` - Human-readable container name
- `at (x, y)` - Optional explicit position for the container center

**Rendering:**
Containers can be rendered as:
- **Swimlanes** - Horizontal or vertical bands
- **Colored zones** - Background regions
- **Toggleable groups** - Show/hide in UI

---

### 3. Nodes (Components)

Nodes represent components in your architecture (servers, databases, services, etc.)

**Syntax (two styles supported):**

**Classic Syntax:**
```
node <id>(<icon>)[<label>] <position> <properties>
```

**Bracket-Style Syntax** (Recommended):
```
<id>[<label>]          -- Rectangle node (default)
```,oldString:

**Positioning Modes:**

**A. Explicit Container Position** (Recommended):
```trident
api[API Server] in backend at (150, 100)
decision{Valid Input?} in logic at (200, 100)
```
- `(150, 100)` = (x, y) coordinates
- Node belongs to container
- Precise control over placement

**B. Absolute Position**:
```trident
db[Database] at (200, 50)
check{Is Ready?} at (300, 50)
```
- No container association
- Just (x, y) coordinates

**C. Auto-Layout**:
```trident
cache[Redis] in backend
gate{Decision Point} in flow
```
- No explicit coordinates
- Force-directed layout within container
- Use when you don't care about exact position

**Icons in Bracket-Style Syntax:**
```trident
api[server: API Server] at (100, 100)        -- "server" icon
db[postgres: Database] at (200, 100)         -- "postgres" icon
web[fa:fa-globe: Website] at (300, 100)      -- FontAwesome icon
happy[😀: Happy Node] at (400, 100)          -- Emoji icon
```
- Use `icon: label` format inside brackets
- Icons are optional - omit for text-only nodes
- **Emoji icons supported**: Use emojis directly as icons (e.g., `😀`, `🚀`, `⭐`)
- **FontAwesome icons**: Use `fa:fa-icon-name` format

**Properties:**
- `color:#RRGGBB` - Override default node color
- `textColor:#RRGGBB` - Override text/label color
- `outlineColor:#RRGGBB` - Override outline/border color
- `size:N` - Scale factor (1.0 = default size)

**Shape Examples:**
```trident
server[Web Server] in backend at (100, 180) color:#4A90E2
decision{Valid Input?} in logic at (200, 180) color:#FF9800
endpoint[API] in backend at (300, 180) color:#4CAF50
```

**Supported Shapes (2D):**
- **Rectangle** `[]` - Default shape for most nodes
- **Diamond** `{}` - For decisions, conditionals, or branching logic

**Icon Library:**
Trident includes over **3,400+ built-in icons** for major cloud providers and technologies.

**Icon Naming Conventions:**
Instead of memorizing thousands of IDs, use these inference rules. The system uses fuzzy matching to find the best icon.

1. **Cloud Services**: `provider-service-name` (kebab-case)
   - **AWS**: `aws-lambda`, `aws-ec2`, `aws-s3`, `aws-rds`, `aws-dynamodb`
   - **Azure**: `azure-functions`, `azure-virtual-machine`, `azure-cosmos-db`
   - **GCP**: `gcp-cloud-functions`, `gcp-compute-engine`, `gcp-bigquery`
   - **Salesforce**: `sf-sales`, `sf-service`, `sf-marketing`

2. **Technology / Generic**: `name` (kebab-case)
   - `python`, `java`, `nodejs`, `react`, `angular`, `vue`
   - `docker`, `kubernetes`, `terraform`, `jenkins`, `gitlab`
   - `postgres`, `mysql`, `redis`, `mongodb`, `elasticsearch`

3. **Basic Infrastructure**:
   - `server`, `database`, `cloud`, `disk`, `internet`, `firewall`
   - `user`, `users`, `laptop`, `mobile`, `router`, `switch`

4. **FontAwesome**: `fa:fa-icon-name` (e.g., `fa:fa-globe`, `fa:fa-lock`)

5. **Emojis**: Any Unicode emoji (e.g., `😀`, `🚀`, `⭐`, `💡`)

**Icon Display:**
- Icons appear as **small decorators in the upper right corner** of nodes
- Provide visual categorization without cluttering labels
- Icons are **optional** - nodes without icons display label text only

**Emoji Icon Support:**
Emojis can be used as icons in both syntax styles:
```trident
%% Traditional syntax with emoji
node happy(😀)[Happy Node] in frontend at (100, 200)
node rocket(🚀)[Launch Service] in backend at (200, 200)

%% Bracket-style syntax with emoji
happy[😀: Happy Node] in frontend at (100, 200)
rocket[🚀: Launch Service] in backend at (200, 200)
```
- Emojis are rendered as icons in the upper right corner
- Any Unicode emoji character is supported
- Useful for adding visual flair or representing concepts without specific icon names

---

### 4. Connections (Relationships)

Connections show relationships and data flow between nodes.

**Syntax (both styles supported):**
```
<source> <connector> <target>
<source> <connector>|<label>| <target>        (Pipe syntax)
<source> <connector><label><connector> <target>  (Embedded syntax)
```

**Connector Types:**

| Connector | Meaning | Visual |
|-----------|---------|--------|
| `--` | Basic connection | Solid line |
| `==` | Strong relationship | Thick solid line |
| `-->` | Directed flow | Arrow (animated) |
| `==>` | Critical flow | Thick arrow (animated) |
| `..->` | Async/event flow | Dashed arrow |
| `.->` | Dotted arrow | Dotted arrow |
| `...` | Logical relationship | Dashed line |
| `..` | Dotted line | Dotted line |

**Label Syntax Options:**

**Option 1: Pipe Syntax:**
```trident
webapp -->|HTTPS| api
api -->|SQL Query| database
cache ..->|Invalidate| api
payment ==>|Transaction| processor
```

**Option 2: Embedded Syntax:**
```trident
webapp --HTTPS--> api
api --SQL Query--> database
cache ..Invalidate..-> api
payment ==Transaction==> processor
```

Both syntaxes produce identical results. Use whichever you prefer.

**Examples:**
```trident
%% Basic connections (no labels)
webapp -- api
api == database

%% Labeled connections (pipe syntax)
webapp -->|HTTPS| api
api -->|SQL Query| database
cache ..->|Invalidate| api

%% Labeled connections (embedded syntax)
webapp --HTTPS--> api
api --SQL Query--> database
cache ..Invalidate..-> api

%% Critical flows
payment ==>|Transaction| processor

%% Connections with routing modes
api -->|Query| cache routingMode:bezier
frontend -->|HTTPS| api routingMode:orthogonal
```

**Properties:**
- `color:#RRGGBB` - Override connection color
- `style:identifier` - Reference predefined style
- `routingMode:mode` - Edge routing algorithm:
  - `straight` (default) - Direct straight line
  - `bezier` - Smooth curved path using Bezier curves
  - `orthogonal` - Right-angle paths (Manhattan routing)

---

### 5. Cards (Tooltips/Info Panels)

Add rich information panels to nodes using click callbacks.

**Syntax:**
```
click <nodeId> callback "<markdown content>"
```

**Example:**
```trident
node api(server)[API Server] in backend at (150, 180)
node db(postgres)[PostgreSQL] in data at (150, 80)

click api callback "Express.js REST API handling business logic"
click db callback "PostgreSQL database storing application data"
```

**When to use:**
- Additional context about nodes
- Technical details
- Documentation links
- Implementation notes

**Card Content:**
- Supports Markdown formatting
- Can span multiple lines (quotes must be properly closed)
- Rendered as tooltips or side panels in UI

**Multi-line cards:**
```trident
click api callback "## API Server

**Tech Stack:**
- Express.js
- Node.js 18
- JWT authentication

**Endpoints:**
- /api/users
- /api/products"
```

---

### 6. Text Annotations (Floating Text Boxes)

Text annotations allow adding explanatory notes, labels, or documentation directly on diagrams as floating text boxes.

**Syntax:**
```
text <id> "<content>" at (<x>, <y>) [properties]
text "<content>" at (<x>, <y>) [properties]   (auto-generated ID)
```

**Example:**
```trident
%% Basic text annotation
text note1 "System Overview" at (200, 20) width:300

%% Multi-line content with triple quotes
text features """
### Key Features
- Scalable architecture
- High availability
""" at (400, 100) width:250

%% Centered title with styling
text title "Architecture Diagram" at (200, 10) width:400 align:center textColor:#333333

%% Text box with background and border
text warning "Important Note" at (50, 300) width:150 color:#FFFACD outlineColor:#FFD700 align:center

%% Typography and style options
text note2 "Release checklist" at (520, 220) width:220 height:120 style:textBody fontSize:12 bold:true
text note3 "Deprecated endpoint" at (520, 320) width:220 style:stickyNote fontSize:10 italic:true underline:true strikethrough:false
```

**Properties:**
- `width:N` - Width of the text box in units (default: 150)
- `height:N` - Fixed height of the text box in units (optional; auto-sized when omitted)
- `textColor:#RRGGBB` - Text color (default: #000000)
- `align:value` - Text alignment: `left`, `center`, or `right` (default: left)
- `color:#RRGGBB` - Background color for the text box (optional)
- `outlineColor:#RRGGBB` - Border color for the text box (optional)
- `style:stickyNote|textBody` - Visual style (default: `stickyNote`)
- `fontSize:N` - Font size from `5` to `48` (default: `8`; supports integer and `.5` steps)
- `bold:true|false` - Bold text toggle (default: false)
- `italic:true|false` - Italic text toggle (default: false)
- `underline:true|false` - Underline text toggle (default: false)
- `strikethrough:true|false` - Strikethrough text toggle (default: false)

**Use Cases:**
- Diagram titles and headers
- Section labels and descriptions
- Explanatory notes
- Legends and documentation
- Multi-line markdown content

**Content Syntax:**
- Use `"content"` for single-line or simple text
- Use `"""content"""` (triple quotes) for multi-line content or content containing quotes
- Supports Markdown formatting
- Text automatically wraps within specified width

---

### 7. Images

Embed an external image at a specific canvas position. Images render behind nodes and can be selected, moved, and resized.

**Syntax:**
```
image <id> "<url>" at (<x>, <y>) [width:<w>] [height:<h>] [aspectLock:<bool>]
```

**Parameters:**
- `<id>` — Unique identifier
- `"<url>"` — Image URL (`https://…`) or data URI (`data:image/…`)
- `at (<x>, <y>)` — Center position (not top-left corner)
- `width:N` — Width in units (default: 150)
- `height:N` — Height in units (default: 150)
- `aspectLock:true|false` — Preserve aspect ratio on resize (default: true)

**Example:**
```trident
image logo "https://example.com/logo.png" at (400, 80) width:200 height:80 aspectLock:true
image arch "https://cdn.example.com/diagram.svg" at (300, 300) width:600 height:400 aspectLock:false
```

---

### 8. Swimlanes

A swimlane creates a structured background divided into labeled lanes — either vertical columns or horizontal rows. Nodes placed inside the swimlane automatically snap to the nearest lane center. Regular edges between nodes work normally.

**Syntax:**
```
swimlane <id> at (<x>, <y>) [width:<w>] [height:<h>] [orientation:<o>] [lanes:<n>] [labels:"L1,L2,..."] [label:"Title"]
```

**Parameters:**
- `<id>` — Unique identifier
- `at (<x>, <y>)` — Center position
- `width:N` — Width in units (default: 800)
- `height:N` — Height in units (default: 600)
- `orientation:vertical|horizontal` — Lane direction (default: vertical)
  - `vertical` — Side-by-side columns with headers across the top
  - `horizontal` — Stacked rows with labels on the left
- `lanes:N` — Number of lanes (default: 4; overridden by `labels` count)
- `labels:"L1,L2,..."` — Comma-separated lane names (also sets lane count)
- `label:"Title"` — Swimlane title displayed at the top of the diagram (note: singular, distinct from `labels`)

**Examples:**
```trident
%% Vertical swimlane with title: columns for each system tier
swimlane sw1 at (400, 300) width:800 height:500 orientation:vertical labels:"Frontend,API,Services,Database" label:"Order Processing"

%% Horizontal swimlane with title: rows per team/role
swimlane sw2 at (350, 400) width:700 height:450 orientation:horizontal labels:"Initiator,Approver,System" label:"Approval Workflow"
```

**Behavior:**
- Nodes dragged onto a swimlane snap to the nearest lane center axis
- `+` / `−` buttons in the top-right add or remove lanes
- Double-click a lane header to edit its label inline
- Double-click the title bar to edit the swimlane title inline
- Resizing redistributes lane spacing automatically

---

### 9. Sequence Diagrams

A sequence diagram creates a background with participant boxes at the top and dashed vertical lifelines. Nodes placed in the diagram snap to the nearest participant column. Edges between nodes serve as message arrows between participants.

**Syntax:**
```
sequence <id> at (<x>, <y>) [width:<w>] [height:<h>] participants:"P1,P2,..."
```

**Parameters:**
- `<id>` — Unique identifier
- `at (<x>, <y>)` — Center position
- `width:N` — Width in units (default: 800)
- `height:N` — Height in units (default: 500)
- `participants:"P1,P2,..."` — Comma-separated participant names (determines column count; default: 3 unnamed)

**Example:**
```trident
sequence auth_seq at (450, 300) width:900 height:500 participants:"Browser,API Gateway,Auth Service,Database"
```

**Behavior:**
- Nodes dropped inside snap to the nearest participant column
- `+` / `−` buttons add or remove participants
- Double-click a participant header to rename it inline
- Transparent background — nodes and connections render on top
- No outer border; dark dashed lifelines mark each participant column

---

## Bracket-Style Syntax

Trident uses bracket notation for clean, readable diagrams:

**Rectangle nodes with `[]` brackets:**
```trident
A[Node A]
B[Node B]
A --> B
```

**Diamond nodes with `{}` brackets for decisions:**
```trident
start[Start]
check{Is Valid?}
process[Process Data]
start --> check
check -->|Yes| process
```

**With icons:**
```trident
A[server: API Server]
B[postgres: Database]
gate{Authenticated?}
A --> gate
gate -->|Yes| B
```

**With positioning:**
```trident
A[Node A] at (100, 280)
B{Decision?} at (200, 280)
C[server: API] in backend at (100, 180)
A --> B
B --> C
```

**With cards:**
```trident
A[Node A]
B[Node B]
A --> B

click A callback "This is a card for Node A"
click B callback "Additional info about Node B"
```

**Mixing syntaxes:**
```trident
%% Full Trident syntax (traditional)
node api(server)[API Server] in backend at (100, 180)

%% Bracket syntax (simple)
A[Frontend] at (100, 280)
B[Database] at (100, 80)

%% Bracket syntax with icon
C[postgres: PostgreSQL DB] in data at (200, 80)

%% Connections work between all styles
A --> api
api --> B
api --> C

%% Cards work with all styles
click A callback "Frontend application"
click api callback "Backend API server"
click C callback "PostgreSQL database"
```

**Note:** 
- Bracket-style nodes without icons default to `server` icon
- Icon syntax: `[iconName: Label]` - icon appears in upper right corner
- Traditional syntax `node id(icon)[label]` also supported

---

## Semantic Rules

### Container Rules
- Container identifiers must be unique
- Containers must be defined before use
- Container colors use hex format: `#RRGGBB` or `#RGB`
- Containers are visual groupings, not spatial constraints
- Containers auto-size around their member nodes when no explicit `width`/`height` is set

### Node Rules
- Node identifiers must be unique within diagram
- Icon identifiers reference built-in shapes (see icon_reference.md)
- Nodes using `in <container>` must reference defined containers
- Coordinates can be positive or negative
- Default node color: `#CCCCCC` (light gray)

### Connection Rules
- Source and target can be either **nodes** or **containers**
- Source and target elements must be defined before connection
- Connections can reference nodes/containers in any combination:
  - Node to Node (classic)
  - Node to Container
  - Container to Node
  - Container to Container
- Arrow connectors (`-->`, `==>`, `..->`, `.->`) support animated flow
- Labels support TWO syntaxes: pipe `-->|Label|` or embedded `--Label-->`
- Both label syntaxes are equivalent and produce identical results
- Default connection colors are semantic-based
- Routing modes control edge rendering:
  - `straight` (default) - Direct line
  - `bezier` - Curved paths
  - `orthogonal` - Right-angle paths

### Shape Rules  
- Node shapes are determined by **bracket syntax only**
- `[label]` creates **rectangle** nodes (default for most use cases)
- `{label}` creates **diamond** nodes (for decisions and conditionals)
- Shape affects visual appearance and hitbox
- Diamond nodes are commonly used for decision points in flowcharts

---

## Best Practices

### Layout Organization

**Vertical Tiering** (Recommended):
```trident
%% User-facing at top of screen (small Y)
container frontend color:#4A90E2 label:"Frontend"

%% Business logic in middle (medium Y)
container backend color:#E74C3C label:"Backend"

%% Storage at bottom of screen (large Y)
container data color:#27AE60 label:"Data"
```

**Benefits:**
- Intuitive top-to-bottom flow
- Clear visual hierarchy
- Easy to scan

### Spacing Guidelines

**Component separation:**
- Nodes within container: 50-100 units apart
- Containers (vertical): 160-200 units apart between layers

**Example:**
```trident
node webapp(cloud)[Web] in ui at (100, 100)        %% Top of screen
node mobile(mobile)[Mobile] in ui at (200, 100)    %% 100 units apart horizontally

node api(server)[API] in backend at (150, 280)     %% 180 units below frontend (larger Y = further down)
```

### Color Conventions

**Containers:**
- `#4A90E2` - Blue (Frontend/UI)
- `#E74C3C` - Red (Backend/Services)
- `#27AE60` - Green (Data/Storage)
- `#F39C12` - Orange (External/Third-party)
- `#9B59B6` - Purple (Infrastructure)

**Connections:**
- `#333333` - Default (dark gray)
- `#FF6B6B` - Critical paths (red)
- `#4ECDC4` - Async/events (teal)
- `#FFE66D` - Warnings/slow paths (yellow)

### Naming Conventions

**Identifiers:**
- Use snake_case or camelCase
- Descriptive but concise
- Examples: `user_db`, `authService`, `payment_api`

**Labels:**
- Human-readable titles
- Title Case for proper nouns
- Examples: `[User Database]`, `[Auth Service]`, `[Payment API]`

---

## Complete Example

### E-commerce Architecture with Decision Flow

```trident
%% Modern E-commerce Platform with Request Flow

%% Define containers
container frontend color:#4A90E2 label:"Frontend"
container backend color:#E74C3C label:"Backend Services"
container data color:#27AE60 label:"Data Layer"
container external color:#F39C12 label:"External Services"

%% Frontend nodes (using bracket-style syntax)
web[webapp: Web App] in frontend at (100, 320)
mobile[mobile: Mobile App] in frontend at (250, 320)
admin[webapp: Admin Panel] in frontend at (400, 320)

%% Backend API Gateway with decision flow
api[server: API Gateway] in backend at (250, 240)
auth_check{Authenticated?} in backend at (250, 180)

%% Backend services
auth[server: Auth Service] in backend at (100, 120)
catalog[server: Catalog Service] in backend at (250, 120)
payment[api: Payment Service] in backend at (400, 120)

%% Decision points for payment flow
payment_valid{Valid Payment?} in backend at (400, 60)
inventory_check{In Stock?} in backend at (500, 120)

%% Data nodes
user_db[postgres: User DB] in data at (100, 40)
product_db[postgres: Product DB] in data at (250, 40)
cache[redis: Cache] in data at (350, 40)
order_db[postgres: Orders] in data at (500, 40)

%% External services
stripe[cloud: Stripe] in external at (550, 60)
sendgrid[cloud: SendGrid] in external at (600, 120)

%% Frontend to API Gateway
web --> api
mobile --> api
admin --> api

%% Authentication flow
api --> auth_check
auth_check -->|Yes| catalog
auth_check -->|No| auth
auth --> user_db

%% Catalog operations
catalog --> product_db
catalog --> cache

%% Payment flow with decisions
catalog --> payment
payment --> payment_valid
payment_valid -->|Valid| stripe
payment_valid -->|Invalid| sendgrid
stripe --> inventory_check
inventory_check -->|Yes| order_db
inventory_check -->|No| sendgrid

%% Notification paths
order_db ==> sendgrid
```

### Simple Flowchart Example

```trident
%% Login Flow Decision Tree

start[Start: User Login] at (250, 50)
input[Enter Credentials] at (250, 120)
validate{Valid Credentials?} at (250, 190)
check_2fa{2FA Enabled?} at (150, 260)
verify_2fa[Verify 2FA Code] at (150, 330)
code_valid{Code Valid?} at (150, 400)
success[Login Success] at (250, 470)
failure[Login Failed] at (400, 400)

start --> input
input --> validate
validate -->|Yes| check_2fa
validate -->|No| failure
check_2fa -->|Yes| verify_2fa
check_2fa -->|No| success
verify_2fa --> code_valid
code_valid -->|Yes| success
code_valid -->|No| failure
```

---

---

## See Also

- [generator_prompt.md](generator_prompt.md) - Instructions for LLMs generating Trident diagrams
- [example.md](example.md) - More complete examples
- [icon_reference.md](icon_reference.md) - Full icon library
- [License](LICENSE) - MIT License

---

## Version History

- **v2.0** - Refined 2D specification with intelligent routing and React UI
