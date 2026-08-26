# Project Rules & Development Guidelines

This document outlines the strict guidelines and conventions for contributing to the **Cycle Time Studio** codebase.

---

## 1. File Placement, Directory Structure & Naming Conventions — STRICT

Every file in the repository must be placed in its designated architectural layer and named following the project standards:

### A. Directory Placement Matrix

| Directory               | Purpose                      | What Goes Here                                                                                                                 | What NEVER Goes Here                                  |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `components/ui/`        | Design System Primitives     | Generic, domain-agnostic UI (`button.tsx`, `input.tsx`, `data-table.tsx`, `card.tsx`)                                          | Domain/BPM business logic, Block types, store imports |
| `components/diagram/`   | Diagram Rendering & Canvases | BPMN Modeler, React Flow, Diagram Inspector, custom nodes                                                                      | Generic inputs, unrelated pages                       |
| `components/editor/`    | Parameters & Process Editor  | Block cards, Timesheet, Parameters Drawer tabs, Contribution charts                                                            | Diagram canvases, app shell navigation                |
| `components/layout/`    | Shell & App Layout           | Project Sidebar, Header, Theme Toggle, Locale Switcher                                                                         | Domain calculation logic, raw data tables             |
| `components/home/`      | Home Page Views              | Recent projects list, empty state hero                                                                                         | Detailed process block editors                        |
| `containers/`           | Route State Orchestrators    | `HomeContainer`, `ProjectContainer` connecting Zustand stores with UI                                                          | Reusable primitive UI buttons/inputs                  |
| `services/`             | Core Domain Engines          | Cycle time math (`engine.ts`), Graph layout (`graph.ts`), BPMN XML adapter (`bpmn.ts`), XLSX/CSV parser & exporter (`xlsx.ts`) | React JSX/TSX view components, React state hooks      |
| `store/`                | Zustand State Stores         | Editor state store (`useEditorStore.ts`), projects index persistence (`useProjectsIndex.ts`)                                   | UI components, diagram rendering code                 |
| `types/`                | Domain Type Definitions      | TypeScript interfaces & type aliases (`block.ts`, `task.ts`, `project.ts`, `graph.ts`)                                         | Runtime executable logic or UI code                   |
| `constants/`            | Static Constants             | Block types, default templates, storage keys                                                                                   | Dynamic stateful variables                            |
| `hooks/`                | Reusable React Hooks         | `useSimulation.ts`, `useLocalStorageState.ts`, `useHydration.ts`                                                               | One-off helper functions (use `utils/`)               |
| `utils/`                | Pure Utility Functions       | `cn()`, string helpers, formatters                                                                                             | React components or state hooks                       |
| `i18n/locales/{en,vi}/` | Translation Dictionaries     | JSON namespaces (`common.json`, `diagram.json`, `editor.json`, etc.)                                                           | TypeScript code                                       |

### B. File Naming Rules

1. **React Components & UI Files**: Always use **`kebab-case.tsx`** (e.g., `diagram-inspector.tsx`, `time-sheet-card.tsx`, `graph-data-tab.tsx`).
2. **Pure TypeScript Files**: Use **`kebab-case.ts`** for modules/utilities and **`use<Feature>.ts`** for custom hooks & Zustand stores (e.g., `useEditorStore.ts`, `useProjectsIndex.ts`).
3. **CSS Style Files**: Use **`kebab-case.css`** colocated with the relevant component or in `app/globals.css`.
4. **Mandatory Barrel Exports**: Every directory containing components MUST provide an `index.ts` exporting all public components.

---

## 2. Internationalization (i18n) Rules — STRICT

1. **Zero Hardcoded Text**:
   - Never write raw text strings directly in `.tsx` files.
   - Always wrap user-facing text, placeholders, button labels, and error messages in `useTranslations()` from `next-intl`.
2. **Synchronized Locales**:
   - Whenever a translation key is added, modified, or removed, you **MUST** update both:
     - `i18n/locales/en/*.json` (English)
     - `i18n/locales/vi/*.json` (Vietnamese)
3. **Namespaces**:
   - `common`: Global buttons, status messages, block types.
   - `diagram`: BPMN canvas, Graph panel, Diagram Inspector, auto-layout status.
   - `editor`: Block card inputs, timesheet, parameters panel, contributions.
   - `simulation`: Monte Carlo simulation controls and metric labels.
   - `sidebar`: Project list, new/delete project dialogs.
   - `home`: Recent projects, empty state, welcome hero.

---

## 3. UI Component, Styling & Modularity Standards

1. **shadcn/ui Primitives & Tailwind CSS**:
   - All UI elements must use components from `@/components/ui/` (built with shadcn/ui and Radix UI) and **Tailwind CSS**.
   - Prohibit using raw HTML form elements (`<input>`, `<select>`, `<button>`, `<input type="checkbox">`) when a shadcn/ui equivalent (`Input`, `Select`, `Button`, `Checkbox`, `Switch`, `Card`, etc.) exists in `@/components/ui/`.
   - Adhere strictly to tokens defined in [`docs/DESIGN_TOKENS.md`](file:///Users/phuson/Documents/master-degree/BPM%20-%202026/cycle-time-app/docs/DESIGN_TOKENS.md).

2. **File Size Guardrail (< 500 lines)**:
   - Every file (`.tsx`, `.ts`) **MUST NOT exceed 500 lines of code**.
   - If a component or service approaches or exceeds 500 lines, decompose it into:
     - Sub-components in a dedicated feature sub-directory.
     - Custom React hooks in `hooks/` or colocated.
     - Pure helper functions in `services/` or `utils/`.

3. **Clear & Structured Logic Presentation**:
   - Maintain clear separation between:
     - **Presentation (JSX/TSX)**: Declarative, readable UI with composable components.
     - **State Orchestration**: Zustand store hooks (`store/`) and React hooks (`hooks/`).
     - **Business Calculations**: Pure functional algorithms (`services/engine.ts`, `services/graph.ts`, `services/xlsx.ts`).
     - **Types**: Strict interface definitions (`types/`).
   - Use descriptive, domain-aligned naming conventions without obscure abbreviations.

---

## 4. Component Organization & Architecture Rules

1. **Atomic & Domain Segregation**:
   - `components/ui/`: Reusable primitives only. Must not contain domain logic (no BPM / block references).
   - `components/editor/`: Parameter cards, process flow section, time sheet, block cards.
   - `components/diagram/`: Diagram panels, nodes, inspector, BPMN toolbar.
   - `components/layout/`: Global navigation, shell sidebars, header, theme/locale toggles.
   - `containers/`: Route-level state orchestration and page layout containers.
2. **No Blocking Overlays for Core Workspaces**:
   - Do NOT use modal `Sheet` components with backdrop overlays for workspace sidebars.
   - Workspace panels must be inline elements (`<aside>` / `<div>`) with CSS width transitions (`transition-all duration-300 ease-in-out overflow-hidden`) so the middle diagram canvas remains interactive at all times.

---

## 5. TypeScript & Code Quality Rules

1. **Strict Type Safety (No `any`)**:
   - Never use `any` or `as any`. Use proper domain types from `@/types` or local interfaces (e.g., `LayoutBlock extends Block`).
2. **Immutable State Mutations**:
   - All state mutations for blocks, branches, and tasks must go through `useEditorStore` actions to ensure undo/redo history tracking and persistent storage synchronization.
   - Use recursive helpers (like `mapBlocks`) when modifying nested trees.
3. **Linting & Formatting**:
   - Code must pass `npx eslint .` with **0 errors and 0 warnings**.
   - Code must pass `npx tsc --noEmit` cleanly.
   - Formatted with Prettier (`npm run format`).

---

## 6. Diagram & State Synchronization Rules

1. **Selection Sync**:
   - Clicking a node in React Flow or BPMN canvas must dispatch `select(SelectionKind, id)` in `useEditorStore`.
   - The selected element must update `DiagramInspector`, highlight the node on canvas, and allow jumping to the corresponding parameter card.
2. **Timesheet Linking**:
   - When a block or branch is linked to a `taskId`, its execution time is derived dynamically from `task.time`.
   - Renaming or updating duration in the Timesheet must instantly reflect across all referencing blocks in calculations and diagrams.

---

## 7. Design System & CSS Styling Rules — [DESIGN_TOKENS.md](file:///Users/phuson/Documents/master-degree/BPM%20-%202026/cycle-time-app/docs/DESIGN_TOKENS.md)

All styling and UI layouts must strictly follow the tokens and guardrails defined in [`docs/DESIGN_TOKENS.md`](file:///Users/phuson/Documents/master-degree/BPM%20-%202026/cycle-time-app/docs/DESIGN_TOKENS.md):

1. **Typography**: Always use **`Mona Sans`** font family with validated weights (400, 500) and scale (`12px/16px`, `14px/20px`, `16px/24px`, `24px/32px`).
2. **Corner Radius**: Adhere to the 4-step radius scale:
   - `radius-3` (`10px`): Control corner (buttons, inputs, select badges, badges).
   - `radius-4` (`20px`): Card corner.
   - `radius-2` (`22px`) / `radius-1` (`24px`): Large surface corners.
   - **Never** mix rounded and sharp corners in the same view.
3. **Spacing Rhythm**: Map paddings, margins, and gaps to the validated scale: `space-10` (4px), `space-6` (5px), `space-3` (8px), `space-1` (10px), `space-9` (12px), `space-2` (16px), `space-5` (20px), `space-8` (24px), `space-4` (32px), `space-7` (48px).
4. **Elevation & Depth**: Keep depth flat unless explicit outline/interaction signals exist.
5. **WCAG AA Compliance**: Always maintain at least 4.5:1 contrast ratio for readable text in both Light and Dark themes.
