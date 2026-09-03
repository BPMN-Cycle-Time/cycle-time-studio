<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cycle Time Studio — Agent Directives & Repository Rules

## 1. Project Reference Docs

- [Architecture Guide](file:///Users/phuson/Documents/master-degree/BPM%20-%202026/cycle-time-app/docs/ARCHITECTURE.md): Subsystems, calculation formulas, state management, diagram engines.
- [Calculation Formulas Guide](file:///Users/phuson/Documents/master-degree/BPM%20-%202026/cycle-time-app/docs/FORMULAS.md): Complete, easy-to-read mathematical formulas for Cycle Time, Process Cost, and Monte Carlo.
- [Project Rules](file:///Users/phuson/Documents/master-degree/BPM%20-%202026/cycle-time-app/docs/RULES.md): Coding guidelines, strict i18n rules, UI/UX interaction standards.
- [Workflow Guide](file:///Users/phuson/Documents/master-degree/BPM%20-%202026/cycle-time-app/docs/WORKFLOW.md): Step-by-step development, verification, and commit protocols.
- [Design Tokens & Guidelines](file:///Users/phuson/Documents/master-degree/BPM%20-%202026/cycle-time-app/docs/DESIGN_TOKENS.md): Extracted typography, radius, spacing, color roles, and CSS rules.

## 2. Core Directives for AI Agents

1. **File Placement & Naming Standards**:
   - **Correct Layer**:
     - `components/ui/`: Atomic, domain-agnostic UI primitives only (`button.tsx`, `input.tsx`, `data-table.tsx`).
     - `components/diagram/`: Diagram panels, canvases, inspector, and nodes (`bpmn-panel.tsx`, `graph-panel.tsx`, `diagram-inspector.tsx`).
     - `components/editor/`: Parameter editors, block cards, timesheet (`block-card/`, `time-sheet-card.tsx`, `project-parameters-drawer/`).
     - `components/layout/`: App shell, navigation, theme/locale switchers (`project-sidebar/`, `locale-switcher.tsx`).
     - `containers/`: Route-level container components (`home-container.tsx`, `project-container.tsx`).
     - `services/`: Business engines, calculations, diagram layout engines, and adapters (`engine.ts`, `graph.ts`, `bpmn.ts`).
     - `store/`: Zustand global and persistent store hooks (`useEditorStore.ts`, `useProjectsIndex.ts`).
     - `types/`: Type definitions and interfaces (`block.ts`, `task.ts`, `project.ts`, `graph.ts`).
     - `constants/`: Global static configurations and templates.
   - **Naming Convention**:
     - All component, style, and module files MUST use **`kebab-case`** (e.g. `diagram-inspector.tsx`, `block-branches.tsx`, `bpmn-panel.css`).
     - Store files use `use<Feature>.ts` (e.g. `useEditorStore.ts`, `useProjectsIndex.ts`).
   - **Mandatory Barrel Export**:
     - Any new component created MUST be exported in its directory's `index.ts`.

2. **Strict UI Component & Styling Standards**:
   - All UI must use **shadcn/ui primitives** (from `@/components/ui/`) and **Tailwind CSS**.
   - Do NOT use raw HTML inputs, selects, checkboxes, or buttons when a shadcn/ui equivalent exists.
   - Follow design tokens defined in [`docs/DESIGN_TOKENS.md`](file:///Users/phuson/Documents/master-degree/BPM%20-%202026/cycle-time-app/docs/DESIGN_TOKENS.md).

3. **File Size Guardrail (< 500 lines)**:
   - Every file (`.tsx`, `.ts`) MUST NOT exceed **500 lines of code**.
   - Decompose large files into focused sub-components, custom hooks, or specialized utility modules.

4. **Clear & Modular Logic Presentation**:
   - Maintain strict separation of concerns:
     - Pure calculations & algorithms in `services/`.
     - State management & persistence in `store/`.
     - Atomic UI primitives in `components/ui/`.
     - Domain layout & view composition in `components/` and `containers/`.
   - Write clean, self-documenting code with meaningful variable/function naming.

5. **Strict i18n Enforcement**:
   - Never add raw/hardcoded text in UI components.
   - Always use `useTranslations()` from `next-intl`.
   - When modifying translations, update **both** `i18n/locales/en/*.json` and `i18n/locales/vi/*.json` synchronously.

6. **Strict TypeScript (Zero `any`)**:
   - Do not use `any` or `as any`.
   - Ensure all props, store actions, and data models are fully typed via `@/types` or domain interfaces.

7. **Non-blocking Inline Workspace Panels**:
   - Do not use Radix `Sheet` modals for workspace panels (e.g. `ProjectSidebar`, `ProjectParametersDrawer`).
   - Use inline flex `<aside>` elements with CSS transition classes (`transition-all duration-300 ease-in-out overflow-hidden`) so the middle diagram canvas is always interactive.

8. **Mandatory Static Verification**:
   - Before completing any task, always verify with:
     ```bash
     npx tsc --noEmit
     npx eslint .
     ```
   - Must exit with **0 errors and 0 warnings**.
