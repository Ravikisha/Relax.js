# HRBR Production-Ready Roadmap (Remaining Work)

> Date: 2026-02-28
>
> Goal: turn the current **HRBR prototype** (signals + scheduler + block runtime + compiler prototype + benchmarks) into a **production-ready runtime + compiler toolchain** that fully matches `plan.md` (not MVP/partial).

This file is the “what’s left” plan. It’s written as an execution checklist with milestones and concrete deliverables.

---

## ✅ Scope & success criteria

### We’re “production-ready” when

- Public APIs are stable and documented (runtime + compiler) with clear versioning.
- Compiler works as a real transform (Babel first), integrated into common toolchains.
- Runtime performance is competitive on benchmark suite and doesn’t regress (perf CI).
- Strong correctness story:
  - deterministic scheduling semantics are specified and tested
  - hydration correctness verified
  - fallback reconciler proven with fuzz/property tests
- Build outputs are shippable (ESM/CJS/types), tree-shakeable, and small.
- Error messages, dev warnings, and debug tooling exist.

---

## 📌 Current state (baseline)

Already in repo:

- `runtime/`
  - `signals.ts` (Set-based graph), `scheduler.ts` (lanes/budget/aging), `block.ts` (template+slots), `hydration.ts` (bailout hydration), `fallback.ts` + `reconciler.ts`.
- `compiler/index.ts`
  - TS-based TSX parser ⇒ templateHTML + slot paths + dynamic-structure detection (prototype).
- `benchmarks/`
  - harness + React/Solid adapters with commit barrier.
- Tests for runtime + compiler exist.

This roadmap upgrades each area to the design targets in `plan.md`.

---

## 0) Repo/product packaging (ship-ready)

### Tasks

- [x] **Define packages/entrypoints** ✅
  - `relax` (existing VDOM runtime)
  - `relax/hrbr` (new runtime entry)
  - `relax/compiler` (Babel plugin + helpers)

- [ ] **Outputs / bundling**
  - produce ESM + CJS + `.d.ts` with correct `exports` map
  - ensure tree-shaking works (no side-effectful imports)
  - minified production build + non-minified dev build (optional)

- [ ] **Versioning + compatibility policy**
  - SemVer rules for runtime/compiler
  - document which JSX subset compiles to blocks vs fallback

### Deliverables

- Updated `package.json` exports + build pipeline (rollup)
- `docs/` updated with “Getting Started with HRBR”

---

## 1) Signals: production graph (low overhead, deterministic, leak-safe)

Your plan targets **O(dependents)** propagation with minimal allocations.

### Tasks

- [x] Replace `Set`-based observers/sources with **intrusive linked lists** or pooled arrays ✅
  - keep stable ordering by `(lanePriority, creationId)`
  - avoid allocations inside `signal.set()` except unavoidable scheduling nodes

- [x] Add **memos / computed values** ✅
  - `createMemo(fn, options?)`
  - memo invalidation and dependency tracking

- [x] Add **effect options** (plan API) ✅
  - `createEffect(fn, { lane, budgetMs, name })`
  - ensure options are used by scheduler

- [x] Add **transaction semantics** ✅
  - nested `batch()` behavior specified
  - consistent “flush boundary” behavior

- [x] Add robust cleanup ✅
  - ensure disposed computations fully detach
  - handle re-entrancy (an effect scheduling itself)

## Tests (must-haves)

- [x] property/fuzz tests ✅
- [x] determinism tests across runs (same event sequence ⇒ same flush order/log) ✅
- [x] leak tests (dispose ⇒ no observers remain) ✅

---

## 2) Scheduler: full deterministic latency budget API

Your plan’s novelty is a deterministic scheduler with budgets and lanes.

### Tasks

- [x] Make budgeting a first-class API ✅
  - export `withBudget(budgetMs, fn)` from HRBR entry
  - `scheduler.setFrameBudget(ms)` (global cap)
  - define how per-task `budgetMs` composes with global frame budgets

- [x] Deterministic flush rules (spec + implementation) ✅
  - clear tie-breakers: `(lanePriority, effectivePriority, createdId)`
  - clarify when tasks are reordered/promoted


- [x] Add “deadline” semantics ✅
  - tasks can be scheduled with explicit `deadline`
  - promotion logic uses deadline/age deterministically

- [x] Integrate real browser scheduling strategies ✅
  - `MessageChannel` microtask-like flush option
  - `requestAnimationFrame` flush option for frame budget alignment
  - keep a universal fallback for non-browser (tests)

### Tests

- [x] starvation prevention tests ✅
- [x] budget enforcement tests (work is split across flushes) ✅

---

## 3) Block runtime: full slot system + fast patching

Current `runtime/block.ts` supports text/attr/prop/class/style. Production needs more:

### Tasks

- [x] Slot types parity with plan ✅
  - `event` slots (bind once, stable handler updates)
  - boolean attributes semantics
  - `value`/`checked` input props correctness
  - SVG namespace correctness for attributes

- [ ] Path resolution & caching
  - improve `resolvePath` speed (optional: precompute “walker” ops)
  - validate slot path correctness and provide dev diagnostics

- [ ] Update coalescing + diffing
  - skip DOM writes if value is unchanged (per slot)
  - allow compiler-provided hints for style/class fast paths

- [ ] Block composition
  - nested blocks inside blocks
  - blocks that include fallback-mounted regions

- [ ] Lifecycle & disposal
  - deterministic teardown
  - ensure effects/event handlers clean up

### Tests

- [ ] slot correctness test matrix (HTML + SVG)
- [ ] input controls test suite
- [ ] disposal correctness tests

---

## 4) Hydration: real SSR compatibility

Current hydration is conservative (root tag check + bailout). Production hydration needs stable mapping.

### Tasks

- [ ] Define hydration markers strategy
  - compiler emits stable markers/anchors OR uses deterministic paths with validation
  - decide on comment markers vs data-attributes

- [ ] Structural mismatch detection
  - nodeType/tagName checks along slot paths
  - controlled bailout: remount only the mismatched subtree if possible

- [ ] “No initial rewrite” guarantee
  - hydration attaches without mutating DOM except required event bindings

- [ ] SSR authoring story
  - document server renderer expectations for templateHTML
  - add `runtime/block/ssr.ts` (string renderer) OR specify interop contract

### Tests

- [ ] hydration equivalence tests (SSR string ⇒ DOM ⇒ hydrate ⇒ updates)
- [ ] mismatch bailout tests

---

## 5) Fallback reconciler: production keyed diff + ranges

Your plan wants a lightweight keyed reconciler used only when structure is dynamic.

### Tasks

- [x] Upgrade keyed diff algorithm ✅
  - implement two-ended scan + LIS move minimization
  - ensure minimal DOM ops (moves vs recreate)
  - stable handling of mixed keyed/unkeyed (dev warning)

- [x] Support “logical item ⇒ multiple DOM nodes” (range/fragment items) ✅
  - represent a child as a **range** (start/end anchors) rather than single node
  - crucial for components/fragments where one keyed item expands to multiple nodes
  - update reconciler contract accordingly

- [x] Provide dev diagnostics ✅
  - duplicate keys
  - unstable keys detection

### Tests

- [ ] fuzz tests comparing DOM output with a reference implementation
- [ ] fragment/range keyed reorders tests

---

## 6) Compiler: real JSX transform (Babel) + metadata + codegen

Right now the compiler is TS-AST-based and returns mostly metadata. Production requires a **real transform** that emits runnable code.

### Tasks

- [x] Create a Babel plugin scaffold: `compiler/jsx/transform.ts`
  - parse JSX
  - (next) extract static template into `templateHTML`
  - (next) generate slot defs with deterministic paths
  - (next) classify dynamic value vs dynamic structure
  - (next) emit `defineBlock(...)` + `mountCompiledBlock(...)` calls

- [x] Initial codegen (v0): intrinsic single-element blocks
  - emits a hoisted `defineBlock({ templateHTML, slots })`
  - emits `host => mountCompiledBlock(def, host, slots)` factory for expression position
  - supports dynamic: `className`, `style`, and basic attributes
  - limitations: no children expressions, no events, no fragments, no nested elements

- [x] Generate slot readers (real closures)
  - compiler must emit `read: () => expr` functions in generated output
  - avoid runtime string eval

- [x] Lane/priority analysis
  - support explicit annotations (pragma or helper) to set lane/budget
  - heuristics: input handlers ⇒ `input` lane, animations ⇒ `transition`, etc.

- [x] Fallback routing ✅
  - for dynamic structure (loops/conditionals/spreads), emit `mountFallback()` code
  - produce child specs for fallback reconciler

- [x] Source maps + dev mode ✅
  - readable output in dev
  - stable slot naming for debugging

### Tests

- [x] smoke test: plugin loads and parses JSX (`compiler/__tests__/babel-transform.test.ts`)
- [x] e2e-ish transform coverage: nested elements + dynamic text slot paths asserted (`compiler/__tests__/babel-transform.test.ts`)
- [x] snapshot tests for transform output (`compiler/__tests__/babel-transform.test.ts`)
- [x] e2e tests running transformed code in jsdom (`compiler/__tests__/babel-transform.e2e-jsdom.test.ts`)
- [x] compile errors with helpful messages (`compiler/__tests__/babel-transform.errors.test.ts`)

---

## 7) Integration: mixed trees (VDOM + HRBR) and migration path

### Tasks

- [ ] Introduce a stable HRBR “element return type”
  - allow components to return either VDOM nodes or block instances
  - define how they mount/unmount and interop

- [ ] Event system alignment
  - match Relax VDOM event semantics
  - ensure delegation strategy (if any) is compatible

- [ ] Devtools hooks (optional but valuable)
  - expose counters: slot writes, scheduled computations, flush durations
  - optional debug naming via compiler (`name` in effect options)

---

## 8) Benchmarks: production methodology + perf CI

You already have a strong harness. Production readiness needs repeatability and regression detection.

### Tasks

- [ ] Add benchmark “profiles”
  - `dev` vs `prod` builds
  - consistent seedable RNG for list updates

- [ ] Add CI perf smoke check (non-flaky)
  - run a reduced benchmark set with thresholds (wide margins)
  - store results artifact for inspection

- [ ] Add runtime instrumentation behind a flag
  - allocations counter hooks (manual)
  - number of DOM ops per frame (approx)

---

## 9) Documentation: production docs set

### Tasks

- [ ] Write the docs outlined in `plan.md`
  - `docs/hrbr-whitepaper.md` (complexity + model)
  - `docs/compiler.md` (supported JSX subset, fallback rules)
  - `docs/scheduler.md` (lanes, budgets, determinism)
  - `docs/benchmarks.md` (how to run, fairness, commit barriers)

- [ ] Add examples
  - `examples/dashboard` (many independent signals)
  - `examples/list` (dynamic structure + fallback)
  - SSR + hydrate example

---

## 10) Quality gates (must pass before release)

- [ ] Typecheck: `tsc --noEmit` clean
- [ ] Lint clean
- [ ] Unit tests green
- [ ] Fuzz/property tests run in CI
- [ ] Build outputs generated and exercisable
- [ ] Benchmarks run without obvious measurement artifacts
- [ ] API docs + changelog updated

---

## Suggested milestone order (production sequence)

1. **Compiler transform (Babel) + runtime API stabilization** (unblocks real usage)
2. **Fallback reconciler upgraded to keyed ranges** (correctness + real apps)
3. **Signals graph optimization + memo support** (performance & capability)
4. **Hydration markers + SSR story** (production web apps)
5. **Perf CI + docs + examples** (release discipline)

---

## Notes / key architectural decisions to make early

- **Range-based keyed items** in fallback is the biggest correctness blocker for real-world components/fragments.
- Decide whether the compiler is:
  - “always compile to blocks when possible” + fallback regions, or
  - “explicit opt-in directive” (e.g. `/** @block */`) for early production.
- Decide the SSR approach (string renderer vs interop contract) to avoid repaint on hydrate.

---

## Progress log

- 2026-02-28: **Started Milestone 1** (Babel compiler transform scaffold added under `compiler/jsx/`).
- 2026-02-28: Added transform test coverage for **nested intrinsic elements + dynamic text children** (path generation) and kept the full test suite green.
- 2026-02-28: Added **snapshot test** for Babel transform output (normalized indentation for stability) and verified `npm test` is green.
- 2026-02-28: Added **jsdom e2e test** that mounts transformed output and verifies reactive updates (`compiler/__tests__/babel-transform.e2e-jsdom.test.ts`); verified `npm test` is green.
- 2026-02-28: Confirmed Babel transform emits **slot reader closures** (`read: () => expr`) for each compiled slot.
- 2026-02-28: Added **helpful compiler errors** (CodeFrameError when available) for unsupported JSX in block mode (events, spreads, fragments, components) + tests (`compiler/__tests__/babel-transform.errors.test.ts`).
- 2026-02-28: Added **lane pragma support** to the Babel JSX transform (`/*@lane transition*/`) and emit per-slot `lane` metadata; added tests.
