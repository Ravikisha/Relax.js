# Relax.js — A Deep Build Guide (Book Plan)

> Goal: teach someone how this project was built, end-to-end, with enough detail to reproduce the runtime and tooling.
>
> Prerequisites: Node.js, React knowledge (JSX mental model), JavaScript, TypeScript.
>
> Target length: **~400+ pages** (depending on formatting), designed to be written as a real book.
>
> This file is an outline + writing plan. It includes: terminology, methodology, chapter structure, code-reading paths, exercises, runnable examples, and test-driven checkpoints.

---

## How to use this plan

- Treat each chapter as a “deliverable”.
- Every major concept has:
  - **Concept** (what and why)
  - **Contract** (inputs/outputs/invariants)
  - **Implementation walkthrough** (files + key functions)
  - **Tests** (how we know it works)
  - **Exercises** (reader builds/extends something)

Where this repo already has docs, reuse them as seeds:

- `docs/hrbr-whitepaper.md`
- `docs/compiler.md`
- `docs/scheduler.md`
- `docs/benchmarks.md`

---

## Book-writing workflow (saved instructions)

These are the working rules for writing this book in this repo.

### What I will do

1. **Write the book in LaTeX** inside the `book/` folder (starting with `book/main.tex`).
2. **Read the codebase to understand behavior before writing**.
  - I’ll follow the “public API → core runtime → helpers → tests” path.
  - I’ll cite exact files and key functions as code references.
3. **Write in detail**:
  - Define terminology first.
  - State a small contract (inputs/outputs/invariants).
  - Explain *why* the code is shaped the way it is.
  - Show minimal, relevant code excerpts (not full-file dumps).
4. **Tie every chapter to tests**.
  - For each major claim, point to the test suite that enforces it.
5. **After every writing task**, I will:
  - mark the task as done in the checklist below
  - keep changes small and ensure the repo stays green (tests still pass)

### What I won’t do

- I won’t paste huge chunks of source code; I’ll reference files/functions.
- I won’t invent APIs that don’t exist in the repo.

---

## Writing task tracker

- [x] Create `book/main.tex` with a minimal LaTeX skeleton that builds. (Done)
- [x] Split chapters into separate LaTeX files under `book/chapters/` and `\input{...}` them from `book/main.tex`. (Done)
- [x] Write Chapter 1 (LaTeX): What we’re building & why. (Drafted in `book/chapters/ch01-what-and-why.tex`)
- [x] Write Chapter 2 (LaTeX): Repo tour & project constraints. (Drafted in `book/chapters/ch02-repo-tour.tex`)
- [x] Write Chapter 3 (LaTeX): TypeScript + JSX prerequisites. (Drafted in `book/chapters/ch03-tsx-jsx.tex`)
- [x] Write Part II / Chapter 4 (LaTeX): VNode model (`src/h.ts`). (Drafted in `book/chapters/ch04-vnode-model.tex`)
- [x] Write Part II / Chapter 5 (LaTeX): Mounting DOM (`src/mount-dom.ts`). (Drafted in `book/chapters/ch05-mounting-dom.tex`)
- [x] Write Part II / Chapter 6 (LaTeX): Attributes & props (`src/attributes.ts`, `src/utils/props.ts`). (Drafted in `book/chapters/ch06-attributes-props.tex`)
- [x] Write Part II / Chapter 7 (LaTeX): Events + dispatcher (`src/events.ts`, `src/dispatcher.ts`). (Drafted in `book/chapters/ch07-events-dispatcher.tex`)
- [x] Write Part III / Chapter 8 (LaTeX): Patching & diffing (`src/patch-dom.ts`, `src/nodes-equal.ts`, `src/utils/arrays.ts`). (Drafted in `book/chapters/ch08-patching-diffing.tex`)
- [x] Write Part IV / Chapter 9 (LaTeX): Destroying DOM & unmounting (`src/destroy-dom.ts`, `src/component.ts`). (Drafted in `book/chapters/ch09-destroy-unmount.tex`)
- [x] Write Part IV / Chapter 9 (LaTeX): Destroying DOM & unmounting (`src/destroy-dom.ts`, `src/component.ts`). (Drafted in `book/chapters/ch09-destroy-unmount.tex`)
- [x] Write Part IV / Chapter 10 (LaTeX): Scheduling, `nextTick`, and runtime lanes (`src/scheduler.ts`, `runtime/scheduler.ts`). (Drafted in `book/chapters/ch10-scheduling-nexttick.tex`)
- [x] Write Part IV / Chapter 11 (LaTeX): Slots and content projection (`src/slots.ts`, `src/h.ts`, `src/__tests__/slots.test.ts`, `src/__tests__/component-slots.test.ts`). (Drafted in `book/chapters/ch11-slots-content-projection.tex`)
- [x] Write Part III / Chapter 12 (LaTeX): HRBR Signals (`runtime/signals.ts`, `runtime/__tests__/signals.test.ts`, `runtime/__tests__/signals.determinism.test.ts`, `runtime/__tests__/signals.fuzz.test.ts`). (Drafted in `book/chapters/ch12-hrbr-signals.tex`)
- [x] Write Part III / Chapter 13 (LaTeX): HRBR deterministic scheduler (`runtime/scheduler.ts`, `runtime/__tests__/scheduler.test.ts`). (Drafted in `book/chapters/ch13-hrbr-deterministic-scheduler.tex`)
- [x] Write Part III / Chapter 14 (LaTeX): HRBR blocks: template + slots (`runtime/block.ts`, `runtime/__tests__/block.test.ts`, `runtime/__tests__/block-slot-matrix.test.ts`, `runtime/__tests__/block-input-controls.test.ts`, `runtime/__tests__/block-disposal.test.ts`). (Drafted in `book/chapters/ch14-hrbr-blocks-template-slots.tex`)
- [x] Write Part III / Chapter 15 (LaTeX): Hydration (SSR attach) (`runtime/hydration.ts`, `runtime/ssr.ts`, `runtime/__tests__/hydration.test.ts`, `runtime/__tests__/ssr.test.ts`). (Drafted in `book/chapters/ch15-hrbr-hydration-ssr-attach.tex`)
- [x] Write Part III / Chapter 16 (LaTeX): SSR authoring v1 (DOM-based string render for tests/examples) (`runtime/ssr.ts`, `runtime/__tests__/ssr.test.ts`, `docs/hrbr-whitepaper.md`). (Drafted in `book/chapters/ch16-hrbr-ssr-authoring-v1.tex`)
- [x] Write Part III / Chapter 17 (LaTeX): Fallback reconciler (dynamic structure) (`runtime/fallback.ts`, `runtime/reconciler.ts`, `runtime/__tests__/fallback.test.ts`, `runtime/__tests__/reconciler.test.ts`, `runtime/__tests__/reconciler.fuzz.test.ts`). (Drafted in `book/chapters/ch17-hrbr-fallback-reconciler.tex`)
- [ ] Write Part II / Chapter 7 (LaTeX): Events + dispatcher.
- [ ] Write Part II / Chapter 8 (LaTeX): Patching & diffing (`src/patch-dom.ts`).

---

## Estimated structure & page budget

A practical 400-page book usually lands around **16–20 chapters** with heavier chapters split in parts.

This plan targets:

- Part I (Foundations): ~80 pages
- Part II (Relax VDOM runtime): ~140 pages
- Part III (HRBR: compiled blocks + signals + scheduler): ~140 pages
- Part IV (Tooling, compiler, testing, perf): ~120 pages
- Appendices: ~40 pages

Total: ~520 pages raw outline capacity. Write minimum ~400 by trimming or keeping sections concise.

---

## Terminology glossary (seed list — expand while writing)

### Core VDOM terms
- **VNode**: virtual DOM node object.
- **Mount**: create DOM nodes from VNodes.
- **Patch**: update existing DOM based on old/new VNodes.
- **Reconciliation**: algorithm that decides how to diff children.
- **Key**: identity stable marker used during child reordering.
- **Component**: class-based unit with state, props, lifecycle.
- **Lifecycle hooks**: `onMounted`, `onUnmounted`, etc.
- **Fragment**: list of siblings without wrapper element.

### HRBR terms
- **HRBR**: compiled fast-path runtime (signals + blocks + deterministic scheduler).
- **Block**: stable DOM subtree described by a template + slot metadata.
- **TemplateHTML**: static HTML string used to clone initial DOM.
- **Slot**: dynamic “write location” into the DOM.
- **Slot kind**: `text | attr | prop | class | style | event`.
- **Slot path**: `number[]` childNodes index walk to reach a node.
- **Hydration**: attach runtime to server HTML without rewriting DOM.
- **Bailout**: detect mismatch and remount client-side.
- **Fallback runtime**: used when structure is dynamic (lists/conditionals).
- **Keyed ranges**: a logical item expanding to multiple DOM nodes.

### Tooling & tests terms
- **Vitest**: test runner used in this repo.
- **jsdom**: DOM implementation in Node for tests.
- **Rollup**: bundler used for builds and benchmark bundles.
- **Source maps**: map generated code back to TS/JS.
- **Property/fuzz testing**: randomized tests for correctness invariants.
- **Perf smoke**: tiny benchmark with wide thresholds for CI.

---

# Part I — Foundations (Reader setup + mental model)

## 1. What we’re building (and why)

**Pages**: ~15

- Story: why build a frontend framework.
- Architectural overview:
  - Relax VDOM runtime
  - HRBR compiled runtime
  - Compiler and benchmarks
- What the reader will implement through the book.

**Exercises**
- Run tests (`npm test`) and locate a few example tests.

## 2. Repo tour & project constraints

**Pages**: ~20

- Folder map:
  - `src/` (Relax VDOM)
  - `runtime/` (HRBR)
  - `compiler/` (transform)
  - `benchmarks/`
  - `docs/`
- Coding style + TypeScript conventions.
- Why jsdom tests matter.

**Guided code reading**
- Start at `src/index.js` / `src/app.js` (public exports)
- Then check `runtime/index.ts` (HRBR entry)

## 3. TypeScript + JSX prerequisites (React mental model)

**Pages**: ~20

- React-like JSX vs framework-specific runtime.
- How TSX compiles.
- Relax’s JSX runtime compatibility (from `README.md`).

**Tests to reference**
- `src/__tests__/jsx-tsx.test.ts`
- `src/__tests__/jsx-react-syntax.test.tsx`

---

# Part II — Relax VDOM runtime (from scratch, matching this repo)

## 4. The VNode model (`src/h.ts`)

**Pages**: ~25

**Terminology**
- VNode types: TEXT/ELEMENT/FRAGMENT/COMPONENT/SLOT/HRBR.

**Contract**
- Inputs: tag + props + children.
- Output: typed VNode.

**Implementation walkthrough**
- `src/h.ts`:
  - `h()`
  - `hString()`
  - `hFragment()`
  - child normalization
  - `hSlot()`
  - `hBlock()` (interop hook for HRBR)

**Tests**
- `src/__tests__/h.test.ts`

**Exercises**
- Extend child normalization and write a small test.

## 5. Mounting DOM (`src/mount-dom.ts`)

**Pages**: ~30

**Concept**
- Turn VNodes into real DOM.

**Key functions**
- `mountDOM()` dispatch by node type
- `createTextNode`, `createElementNode`, `createFragmentNodes`, `createComponentNode`

**Events binding model**
- how host component is threaded to event listeners

**Tests**
- `src/__tests__/mount-dom.test.ts`

**Exercise**
- Add a new edge case test for fragment insertion.

## 6. Props, attributes, class, style (`src/attributes.js`, `src/utils/props.js`)

**Pages**: ~35

- Attribute vs property semantics
- boolean attributes
- `class` and `style` normalization

**Tests**
- `src/__tests__/attributes.test.ts`
- `src/__tests__/props.test.ts`

## 7. Event system (`src/events.js` + dispatcher)

**Pages**: ~25

- How events are bound.
- Handler binding semantics.
- Emitting custom events.

**Tests**
- `src/__tests__/events.test.ts`
- `src/__tests__/dispatcher.test.ts`

## 8. Patching & diffing (`src/patch-dom.ts`)

**Pages**: ~45

**Concept**
- Patch = turn old tree into new tree with minimal DOM changes.

**Walkthrough**
- `areNodesEqual()` in `src/nodes-equal.ts`
- `patchDOM()`
- patch element props
- patch children:
  - non-keyed update
  - keyed reorder + LIS

**Tests**
- `src/__tests__/patch-dom.test.ts`
- `src/__tests__/node-equals.test.ts`

**Exercises**
- Implement a simplified diff visualizer for learning.

## 9. Component model (`src/component.js`)

**Pages**: ~40

- State 
- Props
- External content
- Lifecycle hooks
- Event emitting

**Tests**
- `src/__tests__/component.test.ts`
- `src/__tests__/component-lifecycle.test.ts`
- `src/__tests__/component-slots.test.ts`

## 10. Unmounting / cleanup (`src/destroy-dom.ts`)

**Pages**: ~15

- Why cleanup is hard.
- event listener removal
- component unmount semantics

**Tests**
- `src/__tests__/destroy-dom.test.ts`

---

# Part III — HRBR runtime (signals + scheduler + blocks + hydration)

## 11. Why HRBR exists: the compiled fast path

**Pages**: ~15

- Motivation: avoid VDOM tree construction + diff for stable templates.
- Where HRBR is faster vs where it isn’t.
- HRBR interop in Relax VDOM (`hBlock`, DOM_TYPES.HRBR).

## 12. Signals (reactivity graph) — `runtime/signals.ts`

**Pages**: ~35

**Contracts**
- `createSignal(initial) -> [read, write]`
- `createEffect(fn, options?) -> dispose`
- `createMemo(fn, opts?) -> readMemo`
- `batch(fn)` and `untrack(fn)`

**Implementation details**
- intrusive linked lists for observers/sources
- deterministic scheduling order by creation id
- cleanup + disposal invariants

**Tests**
- `runtime/__tests__/signals.test.ts`
- `runtime/__tests__/signals.determinism.test.ts`
- `runtime/__tests__/signals.fuzz.test.ts`

**Exercises**
- Implement a derived helper (e.g. `createComputed`) and test it.

## 13. Deterministic scheduler — `runtime/scheduler.ts`

**Pages**: ~35

**Contracts**
- lanes: `sync|input|default|transition|idle`
- `schedule(lane, run, options?)`
- `flush({budgetMs})`
- `withBudget(budgetMs, fn)`
- `setFrameBudget(ms)`

**Methodology**
- deterministic ordering
- deadlines + aging/promotion
- flush strategies: timeout / MessageChannel / rAF

**Tests**
- `runtime/__tests__/scheduler.test.ts`

**Exercises**
- Add a new lane scenario and verify determinism.

## 14. Blocks (template + slots) — `runtime/block.ts`

**Pages**: ~55

**Contracts**
- `defineBlock({ templateHTML, slots })`
- `mountBlock(def, host, initialValues?, options?) -> MountedBlock`
- `mountCompiledBlock(def, host, compiledSlots, options?)`
- slot kinds: `text/attr/prop/class/style/event`
- path resolution via `childNodes` indices

**Methodology**
- why `templateHTML` must be stable
- how slot paths are generated
- caching prefix walks (`__hrbrPathCache`)
- write coalescing via `Object.is`
- event slot binding once + handler swapping
- nested composition helpers

**Tests**
- `runtime/__tests__/block.test.ts`
- `runtime/__tests__/block-slot-matrix.test.ts`
- `runtime/__tests__/block-input-controls.test.ts`
- `runtime/__tests__/block-disposal.test.ts`

**Exercises**
- Add a new slot kind experiment (e.g. dataset) and tests.

## 15. Hydration (SSR attach) — `runtime/hydration.ts`

**Pages**: ~30

**Contracts**
- `hydrateBlock(def, host, initialValues?) -> HydratedBlock`

**Methodology**
- “no initial rewrite” guarantee (when matched)
- mismatch detection:
  - root tag
  - slot path node type checks
  - element tagName matching against template
- conservative bailout: remount on mismatch

**Tests**
- `runtime/__tests__/hydration.test.ts`

## 16. SSR authoring (v1) — `runtime/ssr.ts`

**Pages**: ~15

- DOM-based string rendering for tests/examples
- contract with hydration

**Tests**
- `runtime/__tests__/ssr.test.ts`

## 17. Fallback reconciler (dynamic structure) — `runtime/fallback.ts` + `runtime/reconciler.ts`

**Pages**: ~45

**Contracts**
- reconcile direct children
- keyed vs unkeyed
- range items (one logical item => multiple DOM nodes)

**Methodology**
- two-ended scan + LIS to minimize moves
- metadata storage in DOM:
  - `__hrbrKey`
  - `__hrbrRangeLen`
- invariants:
  - no unkeyed nodes interleaved in keyed mode
  - shape-change safety for node<->range

**Tests**
- `runtime/__tests__/fallback.test.ts`
- `runtime/__tests__/reconciler.test.ts`
- `runtime/__tests__/reconciler.fuzz.test.ts`

**Exercises**
- Add a new reconciler edge-case fuzz seed and debug it.

---

# Part IV — Compiler, benchmarks, devtools, and production discipline

## 18. VDOM ↔ HRBR interop (mixed trees)

**Pages**: ~25

- New vnode type `DOM_TYPES.HRBR`
- mount + patch + destroy semantics for HRBR vnodes

**Files**
- `src/h.ts` (`hBlock`)
- `src/mount-dom.ts` (create HRBR host)
- `src/patch-dom.ts` (patch HRBR vnode)
- `src/destroy-dom.ts` (cleanup)

**Tests**
- `src/__tests__/hrbr-integration.test.ts`

- [x] Write Part IV / Chapter 18 (LaTeX): VDOM ↔ HRBR interop (mixed trees) (`src/h.ts`, `src/mount-dom.ts`, `src/patch-dom.ts`, `src/destroy-dom.ts`, `src/__tests__/hrbr-integration.test.ts`). (Drafted in `book/chapters/ch18-vdom-hrbr-interop.tex`)

## 19. Compiler architecture overview (prototype + Babel transform)

**Pages**: ~35

- Goals:
  - extract template
  - generate slots + deterministic paths
  - detect dynamic structure
  - emit mount factories

- Phase split:
  - TS-AST prototype (`compiler/index.ts`)
  - Babel transform (`compiler/jsx/...`)

**Tests**
- `compiler/__tests__/compiler.test.ts`
- `compiler/__tests__/compiler.snapshot.test.ts`
- `compiler/__tests__/compiler.e2e.test.ts`

- [x] Write Part IV / Chapter 19 (LaTeX): Compiler architecture overview (prototype + Babel transform) (`compiler/index.ts`, `compiler/jsx/index.ts`, `compiler/jsx/transform.ts`, `compiler/__tests__/compiler.e2e.test.ts`, `compiler/__tests__/babel-transform.e2e-jsdom.test.ts`). (Drafted in `book/chapters/ch19-compiler-architecture-overview.tex`)

## 20. Babel plugin in detail (JSX transform)

**Pages**: ~45

- Babel visitor model
- converting JSX AST to template
- slot extraction + stable keys
- reader closures (`read: () => expr`)
- lane pragmas
- errors for unsupported syntax
- source maps

**Tests**
- `compiler/__tests__/babel-transform.test.ts`
- `compiler/__tests__/babel-transform.errors.test.ts`
- `compiler/__tests__/babel-transform.e2e-jsdom.test.ts`
- `compiler/__tests__/babel-transform.fallback.e2e-jsdom.test.ts`

- [x] Write Part IV / Chapter 20 (LaTeX): Babel plugin in detail (JSX transform) (`compiler/jsx/transform.ts`, `compiler/jsx/index.ts`, `compiler/__tests__/babel-transform.test.ts`, `compiler/__tests__/babel-transform.errors.test.ts`, `compiler/__tests__/babel-transform.fallback.e2e-jsdom.test.ts`). (Drafted in `book/chapters/ch20-babel-plugin-in-detail.tex`)

**Exercises**
- Add one new supported feature (carefully scoped) and expand tests.

## 21. Devtools + instrumentation (optional)

**Pages**: ~20

- counters: slot writes, scheduled computations, flush durations
- optional instrumentation counters: DOM ops, allocs
- how hooks work

**Files**
- `runtime/devtools.ts`

**Tests**
- `runtime/__tests__/devtools.test.ts`
- `runtime/__tests__/instrumentation.test.ts`

- [x] Write Part IV / Chapter 21 (LaTeX): Devtools + instrumentation (optional) (`runtime/devtools.ts`, `runtime/scheduler.ts`, `runtime/signals.ts`, `runtime/block.ts`, `runtime/__tests__/devtools.test.ts`, `runtime/__tests__/instrumentation.test.ts`). (Drafted in `book/chapters/ch21-devtools-instrumentation.tex`)

## 22. Benchmarks methodology (repeatability + fairness)

**Pages**: ~25

- [x] Write Part IV / Chapter 22 (LaTeX): Benchmarks methodology (repeatability + fairness) (`docs/benchmarks.md`, `benchmarks/harness.ts`, `benchmarks/profile.ts`, `benchmarks/main.ts`, `benchmarks/perf-smoke.ts`, `rollup.benchmarks.config.mjs`, `rollup.benchmarks.smoke.config.mjs`). (Drafted in `book/chapters/ch22-benchmarks-methodology.tex`)

- harness design
- profiles + query params (`benchmarks/profile.ts`)
- deterministic RNG (`benchmarks/rng.ts`)
- dev vs prod benchmark bundles
- perf smoke and CI usage

**Docs**
- `docs/benchmarks.md`

## 23. Release-quality discipline: tests, typecheck, lint, builds

- [x] Write Part IV / Chapter 23 (LaTeX): Release-quality discipline: tests, typecheck, lint, builds. (Drafted in `book/chapters/ch23-release-quality-discipline.tex`)

**Pages**: ~20

- quality gates checklist:
  - unit tests
  - fuzz/property tests
  - typecheck
  - lint
  - build outputs

- how to debug failures
- how to keep changes small and verifiable

---

# Appendices

## A. File-by-file reference index

- Short description of every key source file and what it teaches.

## B. Test reading guide

- How to read/write tests in Vitest + jsdom.
- Useful patterns used in this repo.

## C. “Build this project from scratch” checklist

A minimal reproduction path for a learner:

1) Implement `h()` + `mountDOM()` + `patchDOM()` + `destroyDOM()`
2) Implement components + lifecycle
3) Add TSX/JSX runtime support
4) Add HRBR signals + scheduler
5) Add block runtime + hydration + SSR
6) Add fallback reconciler + fuzz tests
7) Add compiler transform + e2e tests
8) Add benchmarks + perf smoke

## D. Glossary (expanded)

Make this exhaustive while writing.

---

# Writing methodology (how you should actually write the 400-page book)

## Principles

- Prefer “explain → implement → test → refactor → benchmark”.
- Always state the contract before showing code.
- Each chapter ends with green tests and a mini-project.

## Code snippets policy

- Every snippet references real files and real functions from this repo.
- Include “what changed” diffs when introducing a new feature.

## Example policy

You’ll include 3 running examples throughout:

1) **Todo app** (VDOM heavy)
2) **Dashboard** (many independent signals)
3) **Dynamic list** (fallback + keyed ranges)

Each example should include:

- source code
- expected DOM output
- tests
- performance notes

---

# Concrete TODO list to start writing

1) Draft Part I Chapters 1–3.
2) Draft Part II Chapters 4–10 by walking `src/` in code order.
3) Draft Part III Chapters 11–17 by walking `runtime/`.
4) Draft Part IV Chapters 18–23 by walking `compiler/` + `benchmarks/`.
5) Write appendices last.

