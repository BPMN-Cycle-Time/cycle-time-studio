# Plan: Add Unit Tests for BPMN Studio Services

## Context

BPMN Studio currently has no automated tests. A recent round of bug fixes refactored the core calculation and process-mining services (`engine`, `sla-benchmark`, `conformance`, `social-network`, `event-log`, `bpr`, `process-discovery`). To protect these fixes and enable confident future refactoring, we will add a Vitest-based unit-test suite focused on pure business-logic services.

## Goals

- Introduce a fast, low-config test runner (Vitest) that works with the existing TypeScript / Next.js / `@/*` path-alias setup.
- Write focused unit tests for the pure functions in `services/` that underpin Cycle Time, Cost, SLA, Conformance, Social Network, Event Log, BPR, and Process Discovery.
- Provide reusable test fixtures and builders so tests are readable and maintainable.
- Add npm scripts for running tests in CI-friendly and local-watch modes.
- Keep the first test milestone scoped: no React component tests, no E2E tests.

## Non-Goals

- UI / React component testing (out of scope for this first pass).
- Visual regression or canvas/graph layout testing.
- Full integration tests across the Zustand store.

## Recommended Approach

### 1. Test Framework & Tooling

Use **Vitest** instead of Jest because:

- Native ESM and TypeScript support without `ts-jest`.
- Works seamlessly with Next.js path aliases (`@/*`).
- Fast watch mode and built-in coverage.
- Compatible with the existing `eslint-config-next` setup.

Packages to install as dev dependencies:

- `vitest`
- `@vitest/coverage-v8`
- `jsdom` (only if we later test DOM helpers; skip for this service-only phase)

No additional test utilities like `@testing-library` are needed for pure service tests.

### 2. Configuration Files

Create `vitest.config.ts` at repo root:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["services/**/*.test.ts", "utils/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["services/**", "utils/**"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Update `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

No `tsconfig.json` changes are required because Vitest reuses the existing `@/*` alias.

### 3. Test File Naming & Location

Place test files next to the source files they exercise:

- `services/engine.test.ts`
- `services/sla-benchmark.test.ts`
- `services/conformance.test.ts`
- `services/social-network.test.ts`
- `services/event-log.test.ts`
- `services/bpr.test.ts`
- `services/process-discovery.test.ts`

This mirrors the project’s co-location pattern and keeps imports short.

### 4. Shared Fixtures & Helpers

Create `services/__fixtures__/blocks.ts` (and optionally `tasks.ts`) exporting small, reusable factory functions:

```ts
import { BlockType, BlockMode } from "@/types";
import type { Block, Branch, Task } from "@/types";

export function seq(id: string, time: number, overrides?: Partial<Block>): Block {
  return { id, type: BlockType.SEQ, label: id, time, ...overrides };
}

export function xor(id: string, branches: Branch[], overrides?: Partial<Block>): Block {
  return { id, type: BlockType.XOR, label: id, branches, ...overrides };
}

export function branch(id: string, p: number, t: number, overrides?: Partial<Branch>): Branch {
  return { id, label: id, p, t, ...overrides };
}

export function task(id: string, name: string, time: number, overrides?: Partial<Task>): Task {
  return { id, name, time, ...overrides };
}
```

These builders keep individual tests declarative and make intent obvious.

### 5. Test Cases by Service

Priority order: engine first (foundational), then SLA/conformance/social-network (recently refactored), then event-log/BPR/process-discovery.

#### `services/engine.test.ts`

- `getLeafTime`:
  - returns task time when `taskId` matches.
  - falls back to the correct raw field (`time`/`t`/`loopTime`).
  - returns `0` for invalid input.
- `computeBlockTime`:
  - SEQ leaf sums direct time.
  - XOR with probabilities summing to 100 computes weighted average.
  - XOR with probabilities summing to 90 normalizes by total and matches `computeBlockDetails` display.
  - AND returns max branch time.
  - LOOP with `r < 1` returns `base / (1 - r)`.
  - LOOP with `r >= 1` returns `Infinity`.
- `computeBlockCost`:
  - leaf cost = `fixedCost + time * hourlyRate`.
  - task-linked cost overrides holder fields.
  - does **not** use ambiguous `cost`/`loopCost` as fixed cost.
- `computeFlow`:
  - total equals `sumArray`.
  - contributions sum to ~100% share.
  - composite LOOP children do not double-count time in contributions.
- `runMonteCarlo`:
  - returns result shape with p50/p85/p95/mean/histogram.
  - mean approximates analytical expected value for a simple SEQ.
  - loop sampling respects `MAX_LOOP_ITERATIONS` cap.

#### `services/sla-benchmark.test.ts`

- `resolveBenchmarkDuration`:
  - custom benchmark by `taskId` wins.
  - falls back to task model time.
  - falls back to block leaf time.
  - returns `null` when nothing matches.
- `enrichEventsWithSla`:
  - sets `slaStatus: "met"` when duration <= benchmark.
  - sets `slaStatus: "delayed"` when duration > benchmark.
  - sets both to `null` when benchmark is unresolved.
- `computeSlaEvaluation`:
  - excludes unevaluated events from compliance rate.
  - computes correct compliance rate and average duration.
  - identifies top delayed tasks.

#### `services/conformance.test.ts`

- `analyzeConformance`:
  - empty input returns 100 fitness with zero cases.
  - conformant trace has no violations and fitness 100.
  - skipped mandatory activity is flagged.
  - unexpected activity is flagged.
  - out-of-order execution is flagged.
  - wrong resource is flagged.
  - XOR alternatives are not flagged as skipped when one branch is executed.
  - returns deterministic results for the same input.

#### `services/social-network.test.ts`

- `buildSocialNetwork`:
  - empty events returns empty nodes/edges.
  - `handover` counts consecutive different-resource events per case.
  - `workingTogether` produces symmetric edges and applies distance decay.
  - respects `minWeight` filter.
  - node/edge counts are deterministic.

#### `services/event-log.test.ts`

- `resolveResource`:
  - uses holder resource first, then task resource, then heuristic fallback.
- `generateEventLog`:
  - returns the requested number of cases.
  - events within a case are chronologically ordered.
  - looped blocks can produce more than one event per case.
- `computeEventLogSummary`:
  - counts cases, events, distinct activities/resources correctly.
- `exportEventLogToCsv` / `exportEventLogToXes`:
  - output contains expected headers/tags.
  - empty events still produce valid (if minimal) output.

#### `services/bpr.test.ts`

- `analyzeBpr`:
  - returns metrics, issues, and recommendations.
  - recommendation confidence scales with event count for data-driven issues.
  - detects high-cost or bottleneck issues from model-only input.

#### `services/process-discovery.test.ts`

- `discoverBpmnFromEventLog`:
  - returns BPMN XML string and discovered blocks/tasks.
  - deterministic for the same event log.
  - handles a simple sequential log with one rework loop.

### 6. Handling Non-Determinism

For stochastic functions:

- Use large sample sizes and assert on statistical properties (mean within tolerance).
- For `generateEventLog`, assert on structural properties (case count, ordering) rather than exact values.
- If needed, Vitest `vi.spyOn(Math, "random")` can be used to pin random behavior for specific loop-iteration tests, but prefer tolerance-based assertions to keep tests robust.

### 7. CI / Verification

After implementing:

1. Run `npm install` to add Vitest and coverage package.
2. Run `npx tsc --noEmit` to ensure config does not break types.
3. Run `npx eslint .` to ensure lint passes (new test files follow existing rules).
4. Run `npm test` to execute the suite.
5. Run `npm run test:coverage` to establish baseline coverage.

## Risks

- **Path-alias resolution**: Vitest must be configured to resolve `@/*`. The proposed `vitest.config.ts` handles this.
- **Stochastic flakiness**: Monte Carlo / event-log tests should use tolerance, not exact equality.
- **Coverage scope creep**: Keep coverage focused on `services/` and `utils/`; do not include UI files or `.next/`.

## Deliverables

- `vitest.config.ts`
- Updated `package.json` scripts
- `services/__fixtures__/blocks.ts` (and `tasks.ts` if needed)
- `services/*.test.ts` for each target service
