# HRBR Tasks (Engineering Backlog)

> This is the actionable work breakdown for delivering the Hybrid Reactive Block Runtime (HRBR) + migrating Relax.js to TypeScript.

The tasks are grouped to:

1) keep the current `src/` VDOM runtime stable (baseline + compatibility)
2) add a new TypeScript HRBR stack (`/runtime`, `/compiler`)
3) add examples, docs, tests, and benchmarks required by the project prompt

---

## ✅ Definition of Done (project-wide)

- TypeScript build passes (`tsc -p tsconfig.json`)
- Unit tests pass (Vitest)
- Benchmarks can be executed locally with reproducible output
- Docs include: architecture overview, compiler rules, scheduler/budget API, hydration strategy
- HRBR hot path produces **no VDOM allocations** for block updates

---

## 0) Repo setup + TypeScript migration (scaffold)

### 0.1 Add TS toolchain (minimum)

- [x] Add `tsconfig.json` (library build)
- [x] Install and configure TypeScript + Rollup TS plugin
- [x] Update Rollup config to accept `.ts` entrypoints (without breaking current JS build)
- [x] Update Vitest config to discover TypeScript tests only (`*.test.ts`, `*.test.tsx`)
- [ ] Update ESLint config to lint TS (or add a separate TS lint step)

Status notes:

- `npm run typecheck`, `npm test`, and `npm run build` all pass.
- Rollup emits a warning about sourcemaps because the Rollup output doesn't set `sourcemap: true`.

JSX/TSX notes:

- TypeScript uses `jsx: react-jsx` + `jsxImportSource: relax-jsx`.
- `relax-jsx` implements a minimal React-like JSX runtime:
	- fragments (`<>...</>`)
	- `className` prop mapping
	- `onClick` (and other `onX`) event props mapping
- Test coverage exists for both TSX runtime wiring and “React-like” syntax expectations.

Deliverables:

- `tsconfig.json`
- updated `rollup.config.mjs`
- updated `vitest.config.js`
- updated `eslint.config.mjs`

### 0.2 Migration strategy (recommended)

- [x] convert all `src/` files immediately. *(We did this already: `src/` runtime is TypeScript-first.)*
- [x] From `src/` to add new TS implementation under `/runtime` and `/compiler`. *(Scaffolds exist under `/runtime` + `/compiler`.)*
- [x] When stable, migrate `src/` module-by-module (rename to `.ts`, add types, keep behavior). *(Completed; ongoing work now is migrating remaining tests/helpers.)*

Reason: avoids blocking HRBR delivery behind a full rewrite.

---

## 1) Runtime: Signals (fine-grained reactive graph)

---

## ✅ JSX/TSX ergonomics (React-like syntax)

Goal: support TSX authoring with a React-like surface area while still producing Relax VDOM nodes.

- [x] Configure TypeScript for `react-jsx` with `jsxImportSource: relax-jsx`
- [x] Provide `relax-jsx/jsx-runtime` and `relax-jsx/jsx-dev-runtime`
- [x] Support fragments (`<>...</>`)
- [x] React-like prop compatibility:
	- [x] `className` → `class`
	- [x] `onClick` / `onInput` / ... → `on: { click/input/... }`
- [x] Tests:
	- [x] TSX wiring smoke test: `src/__tests__/jsx-tsx.test.ts`
	- [x] React-like syntax test suite: `src/__tests__/jsx-react-syntax.test.tsx`

Notes:

- This is TSX-first support (TypeScript transform). A future compiler phase can reuse the same JSX authoring surface.

### 1.1 Core primitives

- [x] `createSignal<T>()` (`runtime/signals.ts`)
- [x] `createEffect()` (`runtime/signals.ts`)
- [x] dependency tracking via "current computation" stack
- [x] deterministic execution order (creation id)

### 1.2 Batching + cleanup

- [x] `batch(fn)` (defers effect runs until end of batch)
- [x] effect cleanup/disposal (`effect.dispose()` + cleanup functions)
- [x] `untrack(fn)`

### 1.3 Performance constraints

- [ ] Avoid `Set` in hot paths (evaluate intrusive list / pooled arrays)
- [ ] Ensure update propagation touches only dependents

Tests:

- [x] tracks dependencies correctly (`runtime/__tests__/signals.test.ts`)
- [x] runs effects deterministically (`runtime/__tests__/signals.test.ts`)
- [x] batches multiple writes into one flush (`runtime/__tests__/signals.test.ts`)

---

## 2) Runtime: Deterministic Scheduler (lanes + latency budgets)

### 2.1 Scheduling model

- [x] lane definitions: `sync`, `input`, `default`, `transition`, `idle`
- [x] task structure: `{ lane, priority, deadline, timestamp, budgetMs }`

### 2.2 Budget enforcement (novel feature)

- [x] global frame budget API
- [x] `withBudget(budgetMs, fn)`
- [x] lane queues + deterministic tie-breaking
- [x] starvation prevention (aging/promotion)

Tests:

- [x] higher priority lanes run first
- [x] budget stops execution and continues next frame
- [x] no starvation across lanes

Implementation notes:

- Implementation: `runtime/scheduler.ts`
- Tests: `runtime/__tests__/scheduler.test.ts`
- Example: `examples/scheduler/basic.ts`

---

## 3) Runtime: Block engine (template + slots)

### 3.1 Block definition + mount

- [x] `defineBlock(def)`
- [x] `mountBlock(def, host, init)`
- [x] DOM parsing via `<template>`
- [x] path resolver: `path: number[]` walking `childNodes`
- [x] slot node cache

### 3.2 Slot patching (no VDOM)

- [x] text slot patch (`node.nodeValue` / `textContent`)
- [x] attribute slot patch (`setAttribute/removeAttribute`)
- [x] property slot patch (direct DOM property assignment)
- [x] class/style fast paths

### 3.3 Signals integration

- [x] `mountCompiledBlock(def, { slotValues, lane })` wires effects per slot
- [x] updates schedule via scheduler lanes

Tests:

- [x] mounting + slot patching smoke tests (`runtime/__tests__/block.test.ts`)
- [x] changing a signal updates only the intended DOM node (`runtime/__tests__/block.test.ts`)
- [x] mounting does not recreate static DOM during updates (`runtime/__tests__/block.test.ts`)

---

## 4) SSR + Hydration

### 4.1 Hydration strategy (V1)

- [x] compiler emits markers OR stable deterministic traversal rules
- [x] `hydrateBlock(def, host)` attaches slot node references
- [x] mismatch detection and bailout to client remount

Tests:

- [x] hydration attaches without rewriting DOM when markup matches (`runtime/__tests__/hydration.test.ts`)
- [x] mismatch triggers remount for subtree (`runtime/__tests__/hydration.test.ts`)

---

## 5) Compiler: JSX → Block transform

### 5.1 Babel plugin (V1 subset)

- [x] parse JSX/TSX (MVP via TypeScript compiler API)
- [x] classify static vs dynamic values vs dynamic structure
- [x] emit `templateHTML` + `slots` (MVP: attribute/class/style/prop slots)
- [x] detect signal usage patterns (e.g. `count()` getter calls)
- [x] annotate priority/lane (heuristics + optional pragma)

### 5.2 Fallback routing

- [x] if dynamic structure detected → route to fallback reconciler

Tests:

- [x] snapshot tests for compiler output
- [x] smoke test: compilation output can mount as a block (`compiler/__tests__/compiler.test.ts`)
- [x] end-to-end test: compiled component updates without VDOM

Status notes:

- Current compiler is an MVP in `compiler/index.ts` (`compileTSXToBlock()`): single-root intrinsic elements only.
- Events are intentionally ignored (not representable as HTML template attributes).
- Text `{expr}` placeholders are not yet wired end-to-end.

---

## 6) Structural fallback: mini-reconciler

### 6.1 Keyed diff

- [x] keyed minimal diff algorithm (two-ended scan + moves)
- [x] unkeyed fallback

### 6.2 Integration

- [x] compiler sets `flags.hasDynamicStructure`
- [x] runtime chooses fallback only for flagged blocks/regions

Tests:

- [x] inserts/removes/moves minimize DOM ops

---

## 7) Examples (developer ergonomics)

- [x] `/examples/dashboard` (200 widgets)
- [x] `/examples/list` (10k rows, 1% updates)
- [x] `/examples/ssr-hydration` (simple page + hydrate)

Each example should include:

- README snippet
- how to run
- how to switch between VDOM baseline and HRBR

---

## 8) Benchmarks

### 8.1 Harness

- [x] requestAnimationFrame loop utility
- [x] timing capture: avg + p95
- [x] frame drop counter
- [ ] optional manual profiling steps (Chrome tracing)

### 8.2 Cases

- [x] `text-1m`
- [x] `list-10k-1pct`
- [x] `widgets-200`

### 8.3 Adapters

#### Benchmark honesty + performance roadmap (React/Solid parity)

> Observed: current React/Solid numbers are artificially low because the harness measures only sync `tick()` time, not framework commit time.
> Goal: make comparisons apples-to-apples, then push HRBR toward fine-grained updates.

- [ ] **Harness**: measure "tick + commit" (add `flush(): Promise<void>` or allow `tick()` to return `Promise<void>`)
	- [ ] React adapter: use `flushSync()` (or an equivalent commit barrier) so time includes DOM commit
	- [ ] Solid adapter: await a microtask / commit barrier after signal writes
	- [ ] Add a harness mode to sample both *sync tick time* and *commit-inclusive time*

- [ ] **HRBR lists**: avoid reconciling/patch-checking all 10k nodes when only 1% change
	- [ ] Implement per-row fine-grained updates (Solid-style): stable `<li>` nodes + per-row signal/effect updates
	- [ ] Or: mount each row as a small `BlockDef` + update only slots for changed rows
	- [ ] Add a new benchmark case variant: `list-10k-1pct:fine` (HRBR fine-grained)

- [ ] **Block engine**: coalesce slot updates per block
	- [ ] In `mountCompiledBlock()`, accumulate dirty slot values and schedule *one* lane task per block flush
	- [ ] Avoid per-slot object allocations (`{ [key]: next }`) and repeated string conversions when unchanged

- [ ] **VDOM baseline fairness** (optional)
	- [ ] Add memoized row components or a component-level should-update to avoid rebuilding 10k VNodes every tick
	- [ ] Add a second VDOM benchmark variant (`list-10k-1pct:memo`) to show best-case baseline

- [ ] Relax.js VDOM baseline adapter
- [ ] HRBR adapter
- [ ] React adapter
- [ ] Solid adapter

Deliverables:

- `docs/benchmarks.md` with methodology + results table template

---

## 9) Docs + Whitepaper

- [ ] `docs/hrbr-whitepaper.md` (architecture, complexity analysis, tradeoffs)
- [ ] `docs/compiler.md`
- [ ] `docs/scheduler.md`
- [ ] `docs/hydration.md`

---

## 10) Packaging / Exports

- [ ] add `exports` map for `relax/hrbr` entry
- [ ] keep `dist/relax.js` stable for current API
- [ ] publish `dist/hrbr.js` or `dist/relax.hrbr.js`
