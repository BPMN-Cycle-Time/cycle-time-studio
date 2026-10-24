# Plan: Add 3 New Process-Mining Tabs to BPMN Studio

## Context

BPMN Studio currently supports basic Process Mining capabilities (event-log simulation, simple process discovery, conformance checking, social-network analysis, BPR, SLA). Compared to a full Process Mining platform, it is missing:

1. **Advanced Process Discovery** with a Directly-Follows Graph (DFG) and Heuristics Miner.
2. **RPA / Automation Opportunity Detection** from event logs and process models.
3. **Industry Templates** (P2P, O2C, ITSM) for rapid project bootstrapping.

This plan adds three new tabs in the project-detail view, implemented one phase at a time to ensure accuracy and reviewability.

## Overall Architecture

Each phase follows the same pattern:

1. Add a new value to `DiagramTab` in `components/layout/compact-activity-bar/compact-activity-bar.tsx`.
2. Add navigation item with icon and i18n key.
3. Add the tab panel to `components/diagram/diagram-panel.tsx`.
4. Create the panel component under `components/diagram/<feature>/`.
5. Add business logic in `services/<feature>.ts`.
6. Add i18n keys in `i18n/locales/en/diagram.json` and `i18n/locales/vi/diagram.json`.
7. Add barrel export in `components/diagram/<feature>/index.ts`.
8. Run `npx tsc --noEmit && npx eslint . && npm test` (when tests exist).

## Phase 1: Advanced Process Discovery Tab

### Goal

Provide a Heuristics Miner that builds a Directly-Follows Graph (DFG) from the event log and infers XOR/AND/LOOP gateways, producing a sound-ish BPMN/block model richer than the current simple discovery.

### New Files

- `services/heuristics-miner.ts` — core DFG + Heuristics Miner algorithm.
- `components/diagram/discovery/discovery-panel.tsx` — new tab UI.
- `components/diagram/discovery/dfg-canvas.tsx` — DFG visual rendering.
- `components/diagram/discovery/discovery-settings.tsx` — threshold controls.
- `components/diagram/discovery/index.ts` — barrel export.
- `types/discovery.ts` — `DfgNode`, `DfgEdge`, `HeuristicsMinerResult`.

### Modified Files

- `components/layout/compact-activity-bar/compact-activity-bar.tsx`: add `"discovery"` to `DiagramTab` and `NAV_ITEMS`.
- `components/diagram/diagram-panel.tsx`: render `<DiscoveryPanel />` for `activeTab === "discovery"`.
- `services/index.ts`: export heuristics-miner functions.
- `types/index.ts`: export discovery types.
- `i18n/locales/en/diagram.json` and `vi/diagram.json`: add tab label, panel title, thresholds, etc.

### Algorithm Outline

1. **Build DFG**: scan event log per case, count directly-follows relations `A -> B`.
2. **Frequency filtering**: drop edges below a user-tunable threshold (default 2 occurrences or 10% relative frequency).
3. **Dependency measure**: for each edge `A -> B`, compute `dep(A,B) = (|A->B| - |B->A|) / (|A->B| + |B->A| + 1)`.
4. **Gateway inference**:
   - **XOR split**: multiple outgoing edges from one activity with comparable frequency and low pairwise dependency.
   - **AND split**: activities that consistently co-occur in parallel traces (use trace ordering relaxation).
   - **LOOP**: backward edges `B -> A` where `A` precedes `B` frequently.
5. **Generate model**: convert inferred gateways + DFG into BPMN XML via `BpmnBuilder`, and into `Block[]` tree via a new adapter.
6. **Apply/Preview**: user can preview DFG and apply the discovered model to the project (same flow as `discovered-bpmn-dialog.tsx`).

### UI

- Left side: threshold sliders (frequency, dependency, loop).
- Center: DFG canvas (SVG) with nodes and directed edges, edge thickness by frequency.
- Right side: discovered BPMN preview and "Apply to Project" / "Apply to BPMN" buttons.

### i18n Keys (examples)

- `discoveryTab`: "Discovery"
- `discoveryTitle`: "Heuristics Miner"
- `discoveryDesc`: "Discover process model from event log using Directly-Follows Graph and heuristics."
- `thresholdFrequency`: "Frequency threshold"
- `thresholdDependency`: "Dependency threshold"
- `thresholdLoop`: "Loop threshold"
- `applyDiscoveredModel`: "Apply to Process Model"

### Verification

- Upload/create a log with XOR branches and loops; verify DFG shows correct edges.
- Adjust thresholds and see gateway inference change.
- Apply model and verify blocks/tasks are imported.
- Run static checks.

---

## Phase 2: RPA / Automation Opportunities Tab

### Goal

Analyze the process model and event log to recommend tasks that are good candidates for Robotic Process Automation (RPA) or other automation.

### New Files

- `services/automation-opportunities.ts` — scoring algorithm.
- `components/diagram/automation/automation-panel.tsx` — new tab UI.
- `components/diagram/automation/automation-score-card.tsx` — candidate task cards.
- `components/diagram/automation/automation-matrix-table.tsx` — sorted table view.
- `components/diagram/automation/index.ts` — barrel export.
- `types/automation.ts` — `AutomationCandidate`, `AutomationScore`, `AutomationAnalysis`.

### Modified Files

- `components/layout/compact-activity-bar/compact-activity-bar.tsx`: add `"automation"` to `DiagramTab` and `NAV_ITEMS`.
- `components/diagram/diagram-panel.tsx`: render `<AutomationPanel />` for `activeTab === "automation"`.
- `services/index.ts`: export automation functions.
- `types/index.ts`: export automation types.
- `i18n/locales/en/diagram.json` and `vi/diagram.json`: add tab label and panel copy.

### Scoring Criteria

For each activity, compute a composite score (0–100) from:

1. **Frequency score**: high frequency = high automation value. `freqScore = min(100, count / maxCount * 100)`.
2. **Predictability score**: low duration variance = predictable = good for RPA. `predScore = 100 - coeffVar * 100` (clamped).
3. **Rule-based score**: heuristic from label text (e.g., contains "data entry", "sync", "export", "validate", "copy"). +20 if matches.
4. **System interaction score**: high if resource is "System / Service" or activity has low human handovers.
5. **Time savings score**: `duration * frequency / totalDuration * 100`.

Composite: weighted average with weights tuned so frequency and time savings dominate.

### Output

- List of candidates sorted by score descending.
- Each candidate shows: activity name, score, frequency, avg duration, estimated time saved, rationale tags.

### UI

- KPI row: total candidates, total hours saved, top candidate.
- Toggle between card view and matrix table.
- Each card has tags like "High Frequency", "Low Variance", "System Task", "Rule-Based".

### i18n Keys

- `automationTab`: "Automation"
- `automationTitle`: "RPA Opportunities"
- `automationDesc`: "Identify repetitive, predictable tasks suitable for automation."
- `candidateCount`: "Candidates"
- `estimatedSavings`: "Est. Savings"
- `score`: "Score"

### Verification

- Create a model with one high-frequency system task and one low-frequency human decision task; verify system task ranks higher.
- Verify time-savings calculation.
- Run static checks.

---

## Phase 3: Industry Templates Tab

### Goal

Allow users to apply pre-built industry templates (P2P, O2C, ITSM) to the current project, replacing or merging blocks/tasks.

### New Files

- `constants/templates.ts` — template definitions for P2P, O2C, ITSM.
- `services/template-applier.ts` — helper to apply a template to a project.
- `components/diagram/templates/templates-panel.tsx` — new tab UI.
- `components/diagram/templates/template-card.tsx` — template preview card.
- `components/diagram/templates/index.ts` — barrel export.
- `types/templates.ts` — `ProcessTemplate`, `ProcessTemplateId`.

### Modified Files

- `components/layout/compact-activity-bar/compact-activity-bar.tsx`: add `"templates"` to `DiagramTab` and `NAV_ITEMS`.
- `components/diagram/diagram-panel.tsx`: render `<TemplatesPanel />` for `activeTab === "templates"`.
- `services/index.ts`: export template helpers.
- `types/index.ts`: export template types.
- `store/useEditorStore.ts`: add `applyTemplate(templateId)` action or reuse `importBlocksAndTasks`.
- `i18n/locales/en/diagram.json` and `vi/diagram.json`: add tab label and template copy.

### Template Content

Each template exports:

- `id`: `"p2p" | "o2c" | "itsm"`
- `name`: localized via i18n key
- `description`: localized
- `blocks`: `Block[]`
- `tasks`: `Task[]`
- `defaultUnit`: e.g. `"hours"`

Example P2P blocks:

1. Create Purchase Request (SEQ)
2. Approve Request (XOR: approve / reject)
3. Create Purchase Order (SEQ)
4. Receive Goods (SEQ)
5. Three-Way Match (AND: invoice, goods, PO)
6. Payment (SEQ)

### UI

- Grid of template cards with name, description, approximate step count.
- Clicking a template opens confirmation dialog: "Applying this template will replace current process model. Continue?"
- On confirm: replace `project.blocks` and `project.tasks` with template data.

### i18n Keys

- `templatesTab`: "Templates"
- `templatesTitle`: "Industry Templates"
- `templatesDesc`: "Apply a pre-built process template to jump-start your analysis."
- `templateP2p`: "Procure-to-Pay"
- `templateO2c`: "Order-to-Cash"
- `templateItsm`: "IT Service Management"
- `applyTemplateConfirm`: "Replace current model with {template}?"

### Verification

- Apply each template and verify blocks/tasks load correctly.
- Verify Cycle Time and Cost calculations run without error.
- Run static checks.

---

## Shared Concerns

### Type Safety

- Add new types to `types/index.ts` barrel.
- Do not use `any`.
- Keep panel files under 500 lines; extract sub-components if needed.

### i18n

- Every new user-facing string must have keys in both `en` and `vi` `diagram.json`.
- Use `useTranslations("diagram")` in components.

### State Management

- New tabs read from existing store (`useEditorStore`) for `blocks`, `tasks`, `uploadedEvents`, etc.
- Templates need a store action to replace blocks/tasks; can reuse `importBlocksAndTasks`.

### Performance

- Heuristics Miner and Automation analysis should be wrapped in `useMemo`.
- Heavy SVG rendering should use `useMemo` for nodes/edges.

### Verification (per phase)

1. `npx tsc --noEmit`
2. `npx eslint .`
3. `npm run format:check`
4. Manual UI check: open project, click new tab, verify rendering and interactions.
5. (When tests exist) `npm test`

## Recommended Execution Order

1. **Phase 1 — Advanced Process Discovery**: highest value, builds on existing discovery code.
2. **Phase 2 — RPA / Automation Opportunities**: reuses event-log analysis patterns.
3. **Phase 3 — Industry Templates**: relatively independent, can be done last.

Each phase should be reviewed and merged before starting the next.
