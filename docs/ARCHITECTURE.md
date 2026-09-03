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

The process model is structured as a hierarchical block tree of **Blocks** (Sequence, XOR, AND, Loop) and **Branches**. The engine computes two parallel dimensions across the entire process: **Cycle Time (CT)** and **Process Cost (Activity-Based Costing)**.

---

### 3.1. Task-Level Elementary Formulas

For any elementary task or process step (defined in the Timesheet or directly on a Block/Branch):

| Parameter       | Symbol | Meaning                                                                        |
| :-------------- | :----: | :----------------------------------------------------------------------------- |
| **Duration**    |  $T$   | Direct execution time in project units (hours, days, etc.)                     |
| **Hourly Rate** |  $R$   | Resource / labor billing rate per unit time ($\text{Currency} / \text{Unit}$)  |
| **Fixed Cost**  |  $F$   | Direct overhead, setup fee, tool license, or material cost ($\text{Currency}$) |

$$\mathbf{\text{Labor Cost} = T \times R}$$
$$\mathbf{\text{Task Cost} = F + (T \times R)}$$

- **Fixed Cost Only**: $R = 0 \implies \text{Cost} = F$.
- **Labor Rate Only**: $F = 0 \implies \text{Cost} = T \times R$.
- **Combined (Both)**: Fully captures fixed overhead plus variable labor.

---

### 3.2. Structural Gateway & Flow Formulas

| Gateway / Block Pattern          | Cycle Time Formula ($CT$)                                        | Process Cost Formula ($\text{Cost}$)                                                |
| :------------------------------- | :--------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **Sequence ($SEQ$)**             | $$CT = \sum_{i=1}^n T_i$$                                        | $$\text{Cost} = \sum_{i=1}^n \text{Cost}_i$$                                        |
| **Exclusive Choice ($XOR$)**     | $$CT = \sum_{i=1}^n \left(\frac{p_i}{\sum p} \times T_i\right)$$ | $$\text{Cost} = \sum_{i=1}^n \left(\frac{p_i}{\sum p} \times \text{Cost}_i\right)$$ |
| **Parallel Concurrency ($AND$)** | $$CT = \max(T_1, T_2, \dots, T_n)$$                              | $$\mathbf{\text{Cost} = \sum_{i=1}^n \text{Cost}_i}$$                               |
| **Rework Loop ($LOOP$)**         | $$CT = \frac{T_{body}}{1 - r}$$                                  | $$\text{Cost} = \frac{\text{Cost}_{body}}{1 - r}$$                                  |

#### Detailed Mathematical Behaviors:

1. **Sequence ($SEQ$)**:
   - **Time**: Sum of all child step durations.
   - **Cost**: Sum of all child step costs:
     $$\text{Cost}_{seq} = \sum_{i=1}^n \Big(F_i + (T_i \times R_i)\Big)$$

2. **Exclusive Decision ($XOR$)**:
   - Represents alternative paths where exactly **one** branch is selected per process instance.
   - Let $p_i$ be the branch probability (normalized by $\text{denom} = \sum_{k=1}^n p_k$, typically $100\%$).
   - **Expected Cycle Time**: Probability-weighted average:
     $$CT_{xor} = \sum_{i=1}^n \left(\frac{p_i}{\sum p} \times T_i\right)$$
   - **Expected Cost**: Probability-weighted average across both labor and fixed cost:
     $$\text{Cost}_{xor} = \sum_{i=1}^n \left(\frac{p_i}{\sum p} \times \text{Cost}_i\right)$$

3. **Parallel Concurrency ($AND$) — Crucial BPM Distinction**:
   - All branches execute concurrently.
   - **Cycle Time**: Determined strictly by the **Critical Path** (the slowest branch):
     $$CT_{and} = \max(T_1, T_2, \dots, T_n)$$
   - **Process Cost**: Unlike cycle time, **financial and human resources are consumed across ALL active branches**. Therefore, total cost is the **SUM** of all branches:
     $$\mathbf{\text{Cost}_{and} = \sum_{i=1}^n \text{Cost}_i = \sum_{i=1}^n \Big(F_i + (T_i \times R_i)\Big)}$$

4. **Rework Loop ($LOOP$)**:
   - Let $r = \frac{\text{loopP}}{100}$ be the probability that a rework pass is triggered ($0 \le r < 1$).
   - The expected number of passes follows the infinite geometric series:
     $$M = 1 + r + r^2 + r^3 + \dots = \frac{1}{1 - r}$$
   - **Expected Cycle Time**:
     $$CT_{loop} = \frac{T_{body}}{1 - r}$$
   - **Expected Process Cost**:
     $$\text{Cost}_{loop} = \frac{\text{Cost}_{body}}{1 - r} = \frac{F_{body} + (T_{body} \times R_{body})}{1 - r}$$
   - If $r \ge 1$ (100% rework loop), $CT \to \infty$ and $\text{Cost} \to \infty$.

---

### 3.3. Tree Contribution & Attribution Breakdown (`computeFlow`)

When flattening the tree for the Contribution Chart and Inspector:

- **Depth-first Scale Multiplier ($\text{scale}$)**:
  - Top-level blocks start at $\text{scale} = 1$.
  - In an $XOR$ block, child branch multiplier is $\text{mult} = \text{scale} \times \frac{p_i}{\sum p}$.
  - In an $AND$ block:
    - Critical branches ($T_i = \max(T)$) maintain $\text{scale}$.
    - Non-critical branches have `excluded = true` for time attribution, but remain fully accounted in cost.
- **Relative Share of Cycle Time**:
  $$\text{Share}_i = \begin{cases} \dfrac{\text{ExpectedTime}_i}{CT_{total}} & \text{if } CT_{total} > 0 \\ 0 & \text{otherwise} \end{cases}$$

---

### 3.4. Monte Carlo Stochastic Simulation (`runMonteCarlo`)

The engine performs $N$ iterations (default $N = 5{,}000$ runs) to simulate real-world variance:

1. **Sampling Decisions**:
   - **$XOR$**: Random number $u \in [0, \sum p)$ selects exactly one branch based on cumulative probability thresholds.
   - **$LOOP$**: Bernoulli trials with probability $p = \min(0.98, \frac{\text{loopP}}{100})$, up to an iteration safety limit of 500.
2. **Statistical Distribution Calculations**:
   Given sorted simulated cycle times $[S_1, S_2, \dots, S_N]$:
   - **Mean ($\mu$)**:
     $$\mu = \frac{1}{N} \sum_{k=1}^N S_k$$
   - **Percentiles ($P_k$)**:
     $$P_k = S_{\lfloor (k / 100) \times N \rfloor} \quad \text{for } k \in \{50, 85, 95\}$$
   - **Min / Max**:
     $$S_{min} = S_1, \quad S_{max} = S_N$$
   - **Histogram Distribution**:
     Divided into $B = 24$ equal-width bins with interval $\Delta = \frac{S_{max} - S_{min}}{B}$:
     $$\text{Bin}_j = [S_{min} + j \Delta, \; S_{min} + (j+1)\Delta)$$

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
