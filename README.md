# Cycle Time Studio

A modern, full-featured web application for **Business Process Management (BPM)** process modeling, cycle time calculation, and stochastic Monte Carlo simulation.

---

## ✨ Features

- **Hierarchical Process Modeling**:
  - **Sequential Steps**: Direct duration or linked to global Timesheet tasks.
  - **Exclusive Decisions (XOR Gateways)**: Probability-weighted execution time calculation.
  - **Parallel Gateways (AND Gateways)**: Critical-path maximum duration calculation.
  - **Rework Loops**: Stochastic loop calculations with repeat probabilities ($CT = \frac{T}{1-r}$).
  - **Composite Sub-processes**: Expand any branch or loop body into a nested sub-process tree.

- **Dual Interactive Diagram Canvases**:
  - **BPMN 2.0 Canvas**: Full standard `bpmn-js` modeler with XML import, export, auto-layout, and bi-directional synchronization.
  - **React Flow Graph Canvas**: Layered node-link visualizer with live interactive node selection and an inline **Diagram Inspector** for direct on-canvas editing (renaming, duration, probabilities, inserting steps before/after, managing branches).

- **Global Timesheet**:
  - Centralized task repository with automatic usage tracking across top-level and nested process flows.

- **Monte Carlo Simulation**:
  - 5,000-run stochastic simulation engine calculating real-world execution distributions ($P_{50}$, $P_{85}$, $P_{95}$, Mean, Min, Max, and interactive histogram).

- **Task Contribution Chart**:
  - Visual breakdown of each task's effective contribution to the total process cycle time.

- **Non-blocking Inline Sliding Panels**:
  - 3-column responsive layout with smooth inline sliding sidebars and resizable parameter drawer — zero modal overlays blocking diagram interactions.

- **100-step Undo / Redo**:
  - Persistent state history powered by Zustand and Zundo.

- **Full Internationalization (i18n)**:
  - English (`en`) and Vietnamese (`vi`) powered by `next-intl`.

- **Dark & Light Themes**:
  - Curated design system tokens based on Mona Sans and Tailwind CSS v4.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended), npm, or yarn

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Scripts

- `pnpm dev`: Start Next.js development server
- `pnpm build`: Build production bundle
- `pnpm start`: Run production server
- `pnpm lint`: Run ESLint checks
- `pnpm format`: Format code with Prettier
- `pnpm format:check`: Check code formatting

---

## 📖 Documentation & Guidelines

Detailed documentation is available in the [`docs/`](./docs) directory:

- [**Architecture Guide**](./docs/ARCHITECTURE.md): Subsystems, mathematical formulas, state management, and component breakdown.
- [**Project Rules & Conventions**](./docs/RULES.md): Coding guidelines, strict i18n rules, and UI/UX interaction standards.
- [**Development Workflow**](./docs/WORKFLOW.md): Step-by-step development lifecycle, verification checklist, and commit conventions.
- [**Agent Directives**](./AGENTS.md): Repository instructions and constraints for AI coding agents.

---

## 📄 License

Private Master's Degree Research Project — BPM 2026.
