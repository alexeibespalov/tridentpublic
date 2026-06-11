---
name: trident-use
description: Use when connected to the Trident collaborative diagramming MCP server. Covers tool ordering, real-time collaboration protocol, how to deliver live suggestions and guided explanations to human collaborators without mutating diagrams, grid layout rules, and ID enumeration before any edit.
tools:
  - get_trident_spec
  - get_generator_guide
  - get_comprehensive_example
  - validate_trident
  - get_quick_start
  - open_document
  - get_document_summary
  - get_recent_changes
  - get_document_png
  - add_node
  - update_node
  - delete_node
  - add_container
  - update_container
  - delete_container
  - add_connection
  - delete_connection
  - add_annotation
  - update_annotation
  - delete_annotation
  - make_suggestion
  - explain
---

# Trident — Real-Time Collaborative Diagramming

## Overview

Trident is a **live collaborative diagramming platform** — not a file generator. Diagrams are shared, real-time documents. Human collaborators see your cursor, your edits, and your callouts as they happen. You are a named presence in the room, not a tool they query and wait on.

Trident works for any domain: software architecture, business process, education (photosynthesis, court systems, history timelines), org charts, data flows, and more.

## Before Your First Tool Call

1. **Ask the human their first name.** Use it everywhere — `userName`, `action_explanation`, casual address.
2. **Set `agentId` to YOUR assistant name** — `"Claude.ai"`, `"GitHub Copilot"`, `"Gemini"`. Never `"AI Agent"` or blank.

Together they render as `"Claude.ai working with Sarah"` in the live presence dot all collaborators see.

## Tool Ordering

**Generating a diagram from scratch:**
1. `get_generator_guide` — **always first, every time.** Contains critical Y-axis rules and spacing formulas. Skip it and you will produce broken output.
2. `open_document` — read the current state before placing anything
3. `add_container` → `add_node` → `add_connection` (in that order)
4. `validate_trident` — check your output before stopping

**Editing a live diagram:**
1. `get_document_summary` — enumerate all entity IDs. **Never guess IDs.**
2. Perform `update_*` / `delete_*` / `add_*` calls
3. Call `get_document_summary` again after bulk changes to verify

**Learning / exploring Trident:**
- `get_quick_start` — first contact, 2-minute overview
- `get_trident_spec` — full DSL grammar and rules
- `get_comprehensive_example` — all syntax features in one diagram

## The Differentiators — What No Other Diagramming Tool Can Do

### `make_suggestion` — Flag Without Touching

Post a visible callout to human collaborators **without changing the diagram at all**. A radar pulse appears on your presence dot for 10 seconds. The suggestion appears attributed to you.

**Use when:** You notice something worth flagging but the human should decide — a missing fallback, a circular dependency, a layout improvement.

```
suggestion: "This service has no retry logic — worth adding a circuit breaker here."
entityId: "payment_service"   ← moves your cursor to that element so everyone knows what you mean
```

Never silently rewrite things. Suggest first. Humans approve.

### `explain` — Be the Teacher

Deliver a narrated explanation anchored to a specific diagram element. Your cursor moves to the element. The explanation appears in the UI attributed to you. This turns any diagram into a guided lesson.

**Use when:** A student asks how photosynthesis works. A new engineer needs a codebase walkthrough. A stakeholder asks what a diagram means. Walk through element by element — `explain` each one in turn.

```
explanation: "This is the chloroplast — the solar panel of the cell. Sunlight hits here first."
entityId: "chloroplast"
```

Don't dump a wall of text. One element at a time. Let the human ask follow-ups.

## Staying in Sync With Other Collaborators

Every tool response may include `changesSinceYourLast` — edits made by **other people** between your last call and now.

- **Non-empty:** Read it before your next action. Someone else moved something. Don't overwrite their work.
- **Absent:** No changes since your last call.

The diagram is never frozen. Humans may be editing while you deliberate.

## Grid Layout Rules

Estimate each container's node count BEFORE placing anything.

| Container size | Approx dimensions |
|---------------|-------------------|
| 2 nodes, 1 row | ~280w × ~130h |
| 4 nodes, 2 rows | ~280w × ~300h |
| 6 nodes, 3 rows | ~280w × ~480h |

- Node spacing: **~120 horizontal, ~160 vertical** within a container
- Container gap: **60–100 units** between container **edges** (not origin points)
- Formula: `next_x = prev_x + prev_width + 80`

Never use uniform spacing sized to the largest container. Size each row independently.

## Authentication

| Tool group | Auth required |
|-----------|---------------|
| `get_trident_spec`, `get_generator_guide`, `get_comprehensive_example`, `validate_trident`, `get_quick_start` | None |
| All document tools (`open_document`, `add_node`, `explain`, `make_suggestion`, etc.) | `token` parameter from the Trident share URL |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping `get_generator_guide` | Always call it first. Every generation session. |
| Guessing entity IDs | Call `get_document_summary` first. Always. |
| Silently rewriting instead of suggesting | Use `make_suggestion`. Let the human approve. |
| Dumping a long explanation | Use `explain` one element at a time. |
| Uniform container spacing | Size each row to its actual content. |
| Leaving `agentId` blank | Set it. Collaborators can't see who "AI Agent" is. |
| Using `open_document` to enumerate IDs | Use `get_document_summary` — it's never truncated. |
