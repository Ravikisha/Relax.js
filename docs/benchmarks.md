# Benchmarks

> Date: 2026-02-28
>
> Status: Draft (v1)

Benchmarks run in a real browser and compare:

- Relax VDOM (`src/`)
- HRBR (`runtime/`)
- adapters for React + Solid

## How it works

Benchmarks run in a real browser using:

- `requestAnimationFrame` to pace work per frame
- `performance.now()` to measure per-tick work
- a warmup window followed by a measurement window

Reported metrics:

- `avg` time per tick
- `p95` time per tick
- `frameDrops`: number of ticks that exceeded the configured budget (default: ~16.7ms)

## Run

This repo doesn't ship a dev server. Use any TS-capable dev server (Vite recommended) and open:

- `benchmarks/index.html`

Example:

```bash
vite --open benchmarks/
```

### Dev vs prod bundles

Some libraries (notably React) change behavior based on `process.env.NODE_ENV` at bundle time.
The benchmark Rollup config supports both modes:

```bash
npm run build:bench:dev
npm run build:bench:prod
```

### Profiles + seeded runs

Benchmarks are intended to be repeatable. The runner supports a few lightweight profiles and a seeded RNG for update patterns.

Query params on `benchmarks/index.html`:

- `profile`: `quick | default | stress`
- `seed`: integer seed used for randomized index updates (React/Solid adapters)
- `warmup`: override warmup frames
- `frames`: override measured frames
- `budget`: override frame budget in ms

Examples:

- Quick sanity pass:
	- `benchmarks/index.html?profile=quick&seed=1`
- Longer run:
	- `benchmarks/index.html?profile=stress&seed=42&budget=16.7`

## Cases

### `text-1m`

- HRBR mode: compiled block with a single text slot updated in chunks

### `list-10k-1pct`

- HRBR mode: `runtime/mountFallback()` + `runtime/reconcileChildren()`
- VDOM mode: `src/` component runtime

Implementation: `benchmarks/cases/list-10k-1pct.ts`

### `widgets-200`

- HRBR mode: 200 widget blocks mounted with `mountCompiledBlock()`
- VDOM mode: keyed widget list in classic VDOM

Implementation: `benchmarks/cases/widgets-200.ts`

## Results template

| Case | Mode | Frames | Avg (ms) | P95 (ms) | Frame drops |
|---|---:|---:|---:|---:|---:|
| list-10k-1pct | hrbr | 120 |  |  |  |
| list-10k-1pct | vdom | 120 |  |  |  |
| widgets-200 | hrbr | 120 |  |  |  |
| widgets-200 | vdom | 120 |  |  |  |

## Perf smoke (CI-friendly)

The reduced, CI-friendly benchmark entry is:

- `benchmarks/perf-smoke.ts`
- `benchmarks/perf-smoke.html`

It builds into `benchmarks/dist-smoke/` using Rollup:

```bash
npm run build:bench:smoke
```

And can be served locally via:

```bash
npm run serve:bench:smoke
```

It prints a JSON summary to the console and uses very wide regression thresholds. It’s intended to fail only on obvious runaway regressions.

## Instrumentation

Optional runtime instrumentation exists behind a flag in `runtime/devtools.ts`.

- `domOps` increments when instrumentation is enabled and the runtime calls `emitDomOp(op)`.
- `allocs` increments via `emitAlloc(kind, count?)` (manual hooks).

Instrumentation is **off by default** so it doesn’t affect production behavior or benchmark results.

### Patch-phase breakdown (VDOM)

For Relax VDOM cases, the benchmark runner can optionally collect a phase breakdown for `src/patch-dom.ts`.

Enable it by adding this query param:

- `patchPhases=1`

Example:

- `benchmarks/index.html?profile=quick&seed=1&patchPhases=1`

This installs a devtools hook and aggregates `patchPhase` events emitted by `patch-dom`.

Phases currently emitted:

- `vdom:diff`: time spent building the diff sequence (`arraysDiffSequence`) and related VDOM traversal overhead
- `vdom:moves`: time spent on DOM reorders (`insertBefore`) in MOVE/reorder paths
- `vdom:attrs`: time spent patching attributes
- `vdom:class`: time spent patching classes
- `vdom:style`: time spent patching styles
- `vdom:events`: time spent patching event handlers

Notes:

- This is intended for perf investigations, not production.
- By default it's hook-only (it does not enable expensive built-in counters like `domOps`).
