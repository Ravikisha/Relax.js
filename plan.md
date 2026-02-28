# Hybrid Reactive Block Runtime (HRBR) for Relax.js — Project Plan

> Date: 2026-02-26

This document is the execution plan for building **HRBR**, a next-generation frontend runtime that replaces general-purpose VDOM diffing on hot paths with **compiled blocks + fine-grained signals + deterministic scheduling**, while retaining a lightweight structural fallback for truly dynamic structures.

The repo today is a VDOM-based runtime (e.g. `src/h.js`, `src/mount-dom.js`, `src/patch-dom.js`, component lifecycle in `src/component.js`). HRBR will be added as a **new runtime mode** and gradually integrated so compiled blocks bypass VDOM work entirely.

---

## ✅ Requirements checklist (from prompt)

- [ ] Compiler layer: JSX transform that extracts static templates, slots, dependency metadata, and priority.
- [ ] Reactive graph layer: fine-grained signals (`createSignal`, `createEffect`, tracking, batching, deterministic order) with O(dependents).
- [ ] Block runtime layer: instantiate template once, cache nodes, direct slot patching (no VDOM in block mode), O(k) slot updates.
- [ ] Deterministic scheduler: lane-based, deadlines/latency budgets, starvation-free.
- [ ] Structural fallback layer: lightweight keyed mini-reconciler for dynamic structure.
- [ ] Performance targets & benchmarks: harness + comparisons (React, Solid, previous Relax.js VDOM).
- [ ] Uniqueness requirement: introduce at least one novel feature.
- [ ] TypeScript implementation, low overhead abstractions, SSR hydration strategy, no full re-render.
- [ ] Project structure: `/compiler`, `/runtime/{signals,scheduler,block,fallback}`, `/benchmarks`, `/examples`, `/docs`.

This plan focuses on *what to build and in what order*; implementation will follow in subsequent commits.

---

## 🎯 Goals and non-goals

### Goals

1. **No VDOM diff in hot paths** for compiled blocks.
2. **O(k)** updates for dynamic slots inside a block instance (k = number of slots updated).
3. **O(d)** signal propagation (d = number of dependents).
4. **Deterministic scheduling** with update lanes and configurable latency budgets.
5. **SSR + hydration** path that reuses server DOM without reconstructing the full tree.
6. Provide a **fallback** reconciler for dynamic/structural cases (keyed minimal diff), used only when necessary.

### Non-goals (for V1)

- Full React-like fiber, concurrent rendering model.
- Universal compiler that handles every JSX edge case; we’ll start with a supported subset and expand.
- Perfect, fully automated hot-path partitioning on day one (we’ll ship a basic version + instrumentation first).

---

## 🧠 HRBR mental model

HRBR uses two cooperating execution models:

1. **Block execution model** (template + slots)
   - DOM structure is mostly static and created once.
   - Dynamic values update by patching pre-indexed DOM nodes directly.
   - No tree diff, no walking.

2. **Graph execution model** (signals)
   - Computations subscribe to signals during execution.
   - Updates propagate only to subscribed computations.
   - Deterministic ordering + batching prevents thrashing.

Only when structure changes do we use:

3. **Fallback reconciler** (mini structural diff)
   - Used for dynamic arrays, conditional node insertion/removal not expressible as stable slots.
   - Still lightweight: keyed minimal diff, no fiber stack.

---

## 🧩 Novel feature (uniqueness requirement)

We’ll implement **Deterministic Latency Budget API** (primary novelty) and leave hooks for optional hot-path optimization instrumentation.

### Latency Budget API (V1)

- Developers can mark effects/updates with a *budget* and *lane*.
- Scheduler enforces max work per frame and defers appropriately.
- Deterministic order: same input event stream → same execution order.

Proposed API:

- `withBudget(budgetMs, fn)` — executes `fn` in a scheduling context.
- `createEffect(fn, { lane, budgetMs, name })`
- `scheduler.setFrameBudget(ms)` global cap.

Optional (V2): **Replayable deterministic execution** by logging signal writes + flush boundaries.

---

## 📁 Target project structure

We’ll add new top-level directories (without breaking current `src/` initially):

```
/compiler
  /jsx
    transform.ts
    ast-utils.ts
    template-extractor.ts
    slot-analyzer.ts
    priority-analyzer.ts
  index.ts

/runtime
  index.ts
  /signals
    signal.ts
    effect.ts
    batch.ts
    graph.ts
  /scheduler
    lanes.ts
    scheduler.ts
    budgets.ts
  /block
    block.ts
    instantiate.ts
    hydrate.ts
    patch-slots.ts
    dom-path.ts
  /fallback
    reconcile.ts
    keyed-diff.ts
    mount.ts

/benchmarks
  harness.ts
  cases/
    text-1m.ts
    list-10k-1pct.ts
    widgets-200.ts
  adapters/
    relax-vdom.ts
    hrbr.ts
    react.ts
    solid.ts

/examples
  dashboard/
  list/

/docs
  hrbr-whitepaper.md
  benchmarks.md
  compiler.md
  scheduler.md
```

Integration approach:

- Keep existing Relax.js runtime in `src/` for baseline benchmarks and compatibility.
- Introduce new TS runtime under `/runtime` and (later) export it as a separate entrypoint (e.g. `relax/hrbr`).

---

## 🔌 Public API surface (V1 contract)

Keep the developer ergonomics familiar, but with a block-first rendering path when compiled.

### Signals

- `createSignal<T>(initial: T): [() => T, (v: T | ((prev: T) => T)) => void]`
- `createEffect(fn: () => void, options?: EffectOptions): void`
- `batch(fn: () => void): void`
- `untrack(fn: () => T): T`

Constraints:

- No allocations in the fast path beyond a small number of node/effect objects.
- O(dependents) propagation.
- Deterministic execution: stable ordering by creation id + lane.

### Block runtime

Compiler emits a module-level `BlockDefinition`:

```ts
type SlotType = 'text' | 'attr' | 'prop' | 'event' | 'style' | 'class'

type SlotPath = number[] // indexes walking childNodes

interface SlotDef {
  id: number
  type: SlotType
  path: SlotPath
  name?: string // attr name, prop name, event name, etc.
}

interface BlockDefinition {
  templateHTML: string
  slots: SlotDef[]
  // Option A: list deps per slot; Option B: compiler emits effect setup function.
  deps?: Record<string, string[]> // debug/introspection only
  priority?: 'immediate' | 'default' | 'idle'
  flags?: {
    hasDynamicStructure?: boolean
    hydrationHints?: boolean
  }
}
```

Runtime uses:

- `mountBlock(def: BlockDefinition, host: Element, init: (slotId) => any): BlockInstance`
- `updateBlock(instance: BlockInstance, updates: Array<{slotId: number, value: any}>): void`

Key behavior:

- Instantiate DOM once from `templateHTML`.
- Cache node refs per slot from `path`.
- Patch types use direct DOM ops (`textContent`, `setAttribute`, etc.).

### Scheduler

- Lanes: `sync`, `input`, `default`, `transition`, `idle`.
- Each scheduled job includes `{ lane, deadline, timestamp, budgetMs }`.

### Fallback

- `reconcile(parent: Node, oldNodes: Node[], newVDOMLike: ... , keyed?: boolean)`

The fallback should remain small and only used when the compiler marks dynamic structure.

---

## 🧱 Compiler layer plan (JSX transform)

### Tooling choice

We’ll build a **Babel plugin** first because it’s easiest to ship cross-toolchain and test.
Later we can add SWC/TS transformer parity.

### Compiler responsibilities

1. Parse JSX AST.
2. Classify nodes/expressions as:
   - **static**: tag names, static attributes, static text, static nesting.
   - **dynamic value**: `{expr}` in text/attr/prop/style/class.
   - **dynamic structure**: conditional elements, `{items.map(...)}`, spread children, fragments with splices.
3. Generate:
   - `templateHTML`: static DOM string.
   - `slots`: `SlotDef[]` with deterministic `path` and metadata.
   - slot → dependency signals/effects mapping.
   - priority metadata from heuristics or explicit API annotation.
4. Emit runtime calls to `mountBlock` and `createEffect` wiring.

### Initial supported JSX subset (V1)

- Static tag names.
- Static nesting.
- Dynamic text values (`<p>{count()}</p>`).
- Dynamic attributes (`<div title={title()} />`).
- Event handlers as static functions (`onClick={handler}`), patched once.
- `class`/`style` dynamic forms in limited patterns.

Explicitly *not* supported in block mode V1:

- Arbitrary child arrays inside JSX (`{items.map(...)}`) → fallback.
- Conditional element insertion/removal (`{cond() ? <A/> : <B/>}`) → fallback initially.

### Output shape

We’ll use a compiled output similar to your example, but also allow embedding a setup function to avoid runtime reflection:

```ts
const _block = defineBlock({
  templateHTML: "<div><h1></h1><p></p></div>",
  slots: [
    { id: 0, type: 'text', path: [0] },
    { id: 1, type: 'text', path: [1] },
  ],
  priority: 'default',
})

export function App() {
  const [title] = createSignal('Hello')
  const [count] = createSignal(0)

  return mountCompiledBlock(_block, {
    slotValues: [() => title(), () => count()],
    lane: 'default',
  })
}
```

Internally `mountCompiledBlock` wires effects per slot getter and uses `updateBlock`.

---

## 🌱 Reactive graph layer plan (signals)

### Data structures

- `Signal<T>`
  - `value: T`
  - `subsHead: Computation | null` (prefer intrusive linked list for fewer allocations)
  - `version: number`

- `Computation` (effect/memo)
  - `fn`
  - `sources` (intrusive list nodes)
  - `lane`, `budgetMs`, `id`
  - `state` (idle/running/scheduled)

Key design goals:

- Replace `Set` with intrusive lists / arrays to reduce GC.
- Track current running computation in a global stack.
- Deterministic order: incrementing `id` assigned at creation; stable flush sorting by `(lanePriority, id)`.

### Batching

- `batch(fn)` defers scheduling until batch depth returns to 0.
- Signal writes inside batch mark computations as dirty once.

### Complexity

- `signal.set` touches only its subscriber list → **O(dependents)**.
- No DOM traversal for value-only updates.

---

## 🧩 Block runtime plan

### Instantiation

1. Create DOM nodes from `templateHTML` using a `<template>` element.
2. Insert into host.
3. For each slot:
   - resolve `path` to a `Node` reference (cached).
   - store in `instance.slotNodes[slotId]`.

### Patch

`updateBlock(instance, updates)` loops updates and patches each slot:

- text: `node.nodeValue` / `textContent`.
- attr: `el.setAttribute(name, value)`.
- prop: `el[name] = value`.
- class/style: fast paths (string set vs object diff depending on compiler hints).

### SSR hydration

Hydration strategy (V1):

- Compiler emits stable markers for slot paths and/or comment anchors.
- At hydrate time:
  - locate root element.
  - resolve slot nodes through deterministic path walking.
  - attach effects and do *no initial DOM rewrite* unless mismatch.

Mismatch policy (V1):

- If structural mismatch detected, bail to client re-mount for that subtree.

---

## ⏱ Deterministic scheduler plan

### Lanes

We’ll implement a minimal lane model:

- `sync` (immediate, cannot be deferred)
- `input` (events)
- `default`
- `transition`
- `idle`

### Budget enforcement

- Global frame budget: e.g. 6–10ms for JS work per frame.
- Each lane has its own queue.
- Flush algorithm:
  1. Always drain `sync`.
  2. Drain `input` and `default` until time budget is near exhaustion.
  3. If time remains, drain `transition`, then `idle`.
  4. If queues remain, schedule next flush via `requestAnimationFrame` or `MessageChannel`.

### Starvation prevention

- Aging: tasks accumulate “age” and can be promoted if they miss deadlines.
- Deterministic tie-breaking: `(effectivePriority, createdId)`.

### Integration points

- Signals schedule computations through the scheduler.
- Block slot patches are executed either:
  - inline for `sync`, or
  - queued as a job (recommended) for predictable budgets.

---

## 🪂 Structural fallback layer plan (mini-reconciler)

We’ll implement a “good enough” reconciler used only when:

- compiler flags `hasDynamicStructure`, or
- runtime receives an array of nodes/blocks where identity changes.

Algorithm goals:

- Keyed diff for children arrays (similar to a lightweight LIS / two-ended scan).
- Minimal DOM moves/insertions/removals.
- No component/fiber stack.

V1 scope:

- Keyed arrays with stable `key`.
- Unkeyed arrays fallback: simple index-based patch with append/remove.

---

## 📊 Benchmarks plan

### Harness

- `requestAnimationFrame` loop.
- `performance.now()` timing.
- Per-frame stats and p95 latency.
- Optional Chrome tracing integration (manual) described in `docs/benchmarks.md`.

### Required cases

1. **10k row list** updating 1% items per frame.
2. **200 widgets** updating at 30–60Hz (independent signals).
3. **Repeated text update** benchmark (1M updates).

### Baselines to compare

- React (production build, minimal app)
- Solid (signals)
- Relax.js current VDOM runtime (this repo’s `src/`)
- HRBR (new runtime)

### Metrics captured

- Average update time
- p95 latency
- Frame drop percentage
- Approx allocations (via counter instrumentation)
- Memory snapshots guidance + optional GC tracing instructions

---

## 🧮 Formal complexity analysis (to include in whitepaper)

We’ll include a short, formal section that compares:

- VDOM diff typical: **O(n)** nodes per update (tree walk + diff), plus allocations.
- Block updates: **O(k)** where k = touched slots.
- Signals propagation: **O(d)** where d = dependent computations.

We’ll also discuss composition:

- When updates are pure value changes inside stable templates: HRBR ≈ O(k + d).
- When structure changes: fallback could approach O(m) where m = changed siblings, but still avoids full tree traversal.

---

## 🗺️ Implementation roadmap (milestones)

### Milestone 0 — Repo preparation (1–2 days)

- Add TS build tooling (tsconfig, build pipeline via rollup/ts or separate package).
- Add new directories and base exports without affecting existing `src/`.
- Add minimal docs skeleton.

Exit criteria:

- `runtime/index.ts` builds.
- Existing tests still pass.

### Milestone 1 — Signals + scheduler core (3–7 days)

- Implement `createSignal`, `createEffect`, dependency tracking.
- Implement basic lane scheduler + batching.
- Unit tests for deterministic ordering + batching semantics.

Exit criteria:

- Signal propagation is O(dependents) (verified by code inspection + microbench).
- Scheduler can cap per-flush time.

### Milestone 2 — Block runtime (5–10 days)

- Implement `defineBlock`, `mountBlock`, `updateBlock`.
- Implement DOM path resolver + caching.
- Implement SSR hydration skeleton + mismatch bailout.

Exit criteria:

- Updating slots triggers direct DOM writes only.
- No VDOM objects created in a block update.

### Milestone 3 — JSX compiler transform (7–14 days)

- Babel plugin prototype for supported subset.
- Emit block definition + slot getters.
- Priority/lane annotations (initial heuristic + optional explicit pragma).

Exit criteria:

- Example JSX compiles into blocks and runs.
- Static template extraction correct for nested elements.

### Milestone 4 — Structural fallback reconciler (5–10 days)

- Implement keyed diff algorithm.
- Integrate compiler detection of dynamic structure to route to fallback.

Exit criteria:

- List benchmark runs with fallback and remains stable.

### Milestone 5 — Benchmark suite + report (7–14 days)

- Build harness and adapters.
- Implement the 3 required cases + baseline adapters.
- Add `docs/benchmarks.md` and first report.

Exit criteria:

- Reproducible runs.
- Clear data tables + notes.

### Milestone 6 — Whitepaper + polish (ongoing)

- Write `docs/hrbr-whitepaper.md` describing the model and complexity.
- Document compiler subset and recommended patterns.

---

## 🔁 Migration / integration strategy with existing Relax.js

We’ll keep current VDOM implementation intact for:

- baseline comparison
- compatibility mode

HRBR will become an **opt-in** runtime:

- `import { createSignal, createEffect, ... } from 'relax/hrbr'`
- JSX compilation targets HRBR block runtime.

Later (optional):

- allow components to return either VDOM nodes (current) or compiled blocks.
- mixed trees: VDOM for legacy, blocks for hot subtrees.

---

## 🧪 Testing strategy

- Unit tests (Vitest) for:
  - signals: tracking, cleanup, batching, ordering
  - scheduler: lane priority, budget enforcement, starvation prevention
  - block runtime: correct path resolution + patching
  - hydration: attaches without rewriting
  - fallback: keyed moves minimal

- Property/fuzzy tests:
  - random signal graph updates compare deterministic ordering outputs.
  - random list diffs compare DOM output equivalence.

---

## 🧰 Instrumentation (for perf + novelty)

We’ll ship lightweight counters behind a flag:

- number of slot writes
- number of scheduled computations
- flush duration histogram
- optional “allocation points” counter (manual increments)

This enables a simple, low-overhead benchmark report.

---

## 🚧 Risks and mitigations

- **JSX coverage**: start with a subset; fallback early for dynamic structures.
- **Hydration correctness**: implement strict path/marker approach; bail out if mismatch.
- **Deterministic scheduling vs UX**: provide lane defaults + developer overrides.
- **Memory overhead**: avoid `Set` where possible; use intrusive lists and pooling.

---

## 📌 Next steps (first commit after this plan)

1. Add `/runtime` skeleton in TypeScript + build config.
2. Implement signals + scheduler core with tests.
3. Introduce block runtime with a hand-written `BlockDefinition` example (no compiler yet).
4. Add compiler prototype and a single example app.
