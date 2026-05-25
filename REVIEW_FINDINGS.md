# Trident LLM Instructions & DSL Audit Findings

## 1. Coordinate System Inconsistency (CRITICAL)
There is a major contradiction between the two primary instruction files regarding the Y-axis:
- **`spec.md`**: Describes a **Cartesian** system where Y increases **UPWARD**.
- **`generator_prompt.md`**: Describes a **Screen** system where Y increases **DOWNWARD**.

**Recommendation**: Standardize on **Screen Coordinates (Y-down)** as it is the industry standard for canvas-based tools and matches the internal renderer's collision logic. Update `spec.md` to reflect this.

## 2. Missing Subgraph Support in V2 Parser
Both `spec.md` and `generator_prompt.md` describe a `subgraph ... end` syntax for grouping nodes. However, the current `parser.js` (V2) implementation lacks a dedicated subgraph parser. This feature appears to have been present in `parser_old.js` but was omitted or lost during the transition to V2.

**Recommendation**: Re-implement `subgraph` support in `parser.js` to match the documentation, or update the documentation to deprecate the native `subgraph` syntax in favor of `containers` and purely `Mermaid` blocks.

## 3. Container vs. Layer Naming
The documentation uses the term `container` exclusively, but the `parser.js` output and `renderer.js` internals still frequently refer to these as `layers`. 

**Recommendation**: Perform a codebase-wide rename of `layers` to `containers` to align with the public-facing DSL and documentation.

## 4. Icon Library Validation
The documentation claims 285+ icons are available. 
- **Confirmed**: `icons/svg-icons-complete.js` contains a large collection of SVG icons.
- **Confirmed**: `managers/badging-manager.js` contains an extensive `EMOJI_MAP`.

**Recommendation**: Add a build-time script or a unit test to automatically sync `icon_reference.md` with the keys in `TRIDENT_SVG_ICONS` to ensure the reference never goes stale.

## 5. Parser Syntax Enhancements
The `parser.js` V2 introduces support for `routingMode:bezier` and `routingMode:orthogonal`, which are powerful features. 
- **Finding**: These are not prominently highlighted in `spec.md` or `generator_prompt.md`.

**Recommendation**: Add examples of explicit routing mode overrides to `example.md` to encourage LLMs to use them for complex architectural diagrams.

## 6. Mermaid Integration
The V2 parser has sophisticated logic for detecting "pure" Mermaid diagrams.
- **Finding**: The documentation should clarify that if an LLM outputs a pure Mermaid diagram (e.g., starting with `graph TD`), Trident will use its layout extractor to position nodes while still applying Trident's premium styling.

**Recommendation**: Explicitly instruct the LLM in `generator_prompt.md` that it can fall back to pure Mermaid syntax if it struggles with manual positioning.
