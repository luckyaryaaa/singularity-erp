---
type: "implementation"
date: "2026-08-01T09:33:11.555347+00:00"
question: "Bagaimana meredesain seluruh workspace menu sidebar dari Dashboard hingga Settings?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["app.js", "styles.css", "visual-baseline.json"]
---

# Q: Bagaimana meredesain seluruh workspace menu sidebar dari Dashboard hingga Settings?

## Answer

Implemented MAT Workbench Horizon as a route-aware shared shell for all 63 sidebar routes. Five archetypes (overview, workbench, control, people, records) add contextual breadcrumb, live workspace status, per-user density preference, responsive page mastheads, refined data surfaces, reduced-motion support, and automatic re-decoration after page rerenders. Visual baseline v10 includes Settings. Validation: 423 tests, 18/18 accessibility, visual smoke desktop/mobile green, release artifact verified, secret scan zero findings.

## Outcome

- Signal: useful

## Source Nodes

- app.js
- styles.css
- visual-baseline.json