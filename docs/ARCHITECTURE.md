# Architecture & Technical Documentation

Cycle Time Studio is an interactive Business Process Management (BPM) process modeling, cycle time calculation, and Monte Carlo simulation platform built with modern web technologies.

---

## 1. Technology Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling & Design System**: Tailwind CSS v4 + Radix UI Primitives + Lucide Icons + Mona Sans font
- **State Management**: Zustand 5 + Zundo 2.3 (Temporal Undo/Redo) + localStorage persistence
- **Diagram Engines**:
  - **BPMN 2.0 Canvas**: `bpmn-js` Modeler + `bpmn-moddle` + `bpmn-auto-layout`
  - **Graph Canvas**: `@xyflow/react` (React Flow 12) + custom `FlowNode` + interactive `DiagramInspector`
- **Charts & Simulation**: `recharts` 3 + custom Monte Carlo engine
- **Internationalization (i18n)**: `next-intl` (English `en` & Vietnamese `vi`)

---

## 2. Directory Structure

```
├── app/                      # Next.js App Router (Layouts, Pages, Global Styles)
│   ├── [locale]/             # (if localized routing) or Root Page & Route handlers
│   ├── globals.css           # Design tokens, CSS variables, dark/light themes
│   └── project/[id]/         # Project editor route
├── components/               # Modular & Encapsulated Component System
│   ├── ui/                   # Design System Primitives (Button, Input, Card, DataTable, etc.)
│   ├── diagram/              # Diagram Panels (BPMN Canvas, ReactFlow Graph, Inspector, Nodes)
│   ├── editor/               # Process Editors (Block Cards, Timesheet, Parameters Drawer)
│   │   ├── block-card/       # Granular block inputs (Sequence, Gateway branches, Loop)
│   │   └── project-parameters-drawer/ # Sliding parameters panel tabs (Parameters, Graph Data)
│   ├── layout/               # Shell & Navigation (ProjectSidebar, Header, Theme & Locale toggles)
│   └── home/                 # Home page components (RecentProjectsList, EmptyState)
├── containers/               # Page-level Container Controllers (HomeContainer, ProjectContainer)
├── constants/                # App-wide constants (Block types, Storage keys, empty BPMN template)
├── hooks/                    # Custom React hooks (useSimulation, useLocalStorageState, useHydration)
├── i18n/                     # next-intl configuration & translation dictionaries
│   ├── config.ts             # Locales definition (en, vi)
│   ├── request.ts            # Server-side message loader
│   └── locales/{en,vi}/      # Namespace dictionaries (common, diagram, editor, home, sidebar, simulation)
├── services/                 # Core Logic & Domain Engines
│   ├── engine.ts             # Cycle time calculation & Monte Carlo simulation math
│   ├── graph.ts              # Directed graph layout, SVG measurement, topology traversal
│   ├── bpmn.ts               # Block Tree ↔ BPMN 2.0 XML bidirectional parser & layout
│   └── xlsx.ts               # XLSX workbook / CSV parsing, normalization, export
├── store/                    # Zustand State Stores
│   ├── useEditorStore.ts     # Active project & flow editor store with undo/redo
│   └── useProjectsIndex.ts   # Project index persistence & metadata
└── types/                    # Domain Type Definitions (Block, Branch, Task, Project, FlowResult, etc.)
```

---

## 3. Core Calculation Engine (`services/engine.ts`)

The process model is structured as a hierarchical tree of **Blocks** and **Branches**.

### Mathematical Formulas

1. **Sequence ($CT_{seq}$)**:
   $$CT = T$$
   Where $T$ is the task duration (direct or resolved from the Timesheet).

2. **Exclusive Decision ($CT_{xor}$)**:
   $$CT = \sum_{i=1}^n (p_i \times T_i)$$
   Where $p_i$ is the probability ($\sum p_i = 100\%$) and $T_i$ is the duration of branch $i$.

3. **Parallel ($CT_{and}$)**:
   $$CT = \max(T_1, T_2, \dots, T_n)$$
   The overall parallel block completes only when the slowest branch finishes.

4. **Rework Loop ($CT_{loop}$)**:
   $$CT = \frac{T}{1 - r}$$
   Where $r$ is the rework probability ($0 \le r < 100\%$) and $T$ is the loop body cycle time.

5. **Monte Carlo Simulation (`runMonteCarlo`)**:
   Runs $N$ iterations (default 5,000 runs) sampling stochastic paths across XOR decisions and loop repeats to generate statistical distribution metrics ($P_{50}$, $P_{85}$, $P_{95}$, Mean, Min, Max, and Histogram).

---

## 4. Diagram & Visualization Subsystems

### A. Graph Panel (React Flow 12)

- Fast top-down directed graph generated from the Block tree via `blocksToGraph()`.
- Interactive selection: Clicking any node highlights it on the canvas and opens the `DiagramInspector` below.
- Supports direct inline editing of names, durations, probabilities, inserting steps before/after, managing branches, and toggling composite sub-processes.

### B. BPMN 2.0 Modeler (`bpmn-js`)

- Full standard BPMN editing palette.
- Bidirectional synchronization:
  - `blocksToBpmnXml()`: Generates semantic BPMN XML + auto-calculates layout with `bpmn-auto-layout`.
  - `bpmnXmlToBlocks()`: Parses arbitrary BPMN XML graphs back into the Block tree with preview and safety warnings.

---

## 5. State Management & Undo/Redo

- **`useEditorStore`**:
  - Encapsulates active project state: `project.blocks`, `project.tasks`, `project.unit`, `selectedId`, `selectedKind`.
  - Wrapped in `zundo` (temporal middleware) providing 100-step Undo/Redo history.
  - Automatically persists changes to `localStorage` via `useProjectsIndex`.
- **`useProjectsIndex`**:
  - Manages metadata index for all user projects (create, duplicate, delete, list).

---

## 6. Layout Architecture (3-Column Inline Panel System)

The UI uses a **3-column responsive flex layout** with zero blocking modal overlays:

1. **Left Sidebar (`ProjectSidebar`)**: Inline sliding navigation rail (`w-14` collapsed $\leftrightarrow$ `w-64` expanded).
2. **Middle Canvas (`DiagramPanel`)**: Main work area housing BPMN Modeler and React Flow Graph.
3. **Right Drawer (`ProjectParametersDrawer`)**: Inline resizable parameters panel (`0px` collapsed $\leftrightarrow$ `320px..768px` expanded) with interactive width drag handle.
