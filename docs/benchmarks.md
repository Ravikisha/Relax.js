# Benchmarks

This document will describe:
- methodology (rAF loop, warmup, measurement window)
- metrics (avg, p95, frame drops, optional allocations counter)
- how to compare: Relax.js VDOM (`src/`) vs HRBR (`/runtime`) + React + Solid

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

---

## Extra cases (vivid micro + macro)

These cases live in `benchmarks/cases/more.ts` and are meant to stress different parts of the rendering pipeline beyond the big two (list/widgets):

### `mount-unmount-1k`

Toggles mounting and unmounting a 1k-row list.

- Relax: `mount-unmount-1k:relax-vdom`
- React: `mount-unmount-1k:react`
- Solid: `mount-unmount-1k:solid`

This helps visualize initial render + teardown costs.

### `keyed-rotate-5k`

Rotates a 5k keyed list by 1 element per tick (pure reorder).

- Relax: `keyed-rotate-5k:relax-vdom`

### `attrs-toggle-1k`

Toggles multiple attributes (`data-*`, `title`, `role`, `aria-label`) across 1k nodes.

### `class-style-1k`

Swaps class lists and style objects across 1k nodes.

### `events-swap-1k`

Swaps event handler references across 1k buttons.

### `fragments-toggle`

Toggles a fragment-heavy tree (nested fragments) to stress fragment extraction + patching.

### `input-type-100`

Simulates typing by growing an `<input>` value up to 100 chars.

### `mixed-2k`

2k keyed list where each tick updates ~10% rows *and* moves a chunk of items (update + reorder combined).

### `hrbr-reconcile-10k`

Pure HRBR keyed reconciliation on 10k keyed nodes (rotation), isolating DOM reorder cost.

### `ssr-hydrate-100-slots`

Hydrates a server-rendered block with 100 text slots and updates all slots each tick.

## Results template

| Case | Mode | Frames | Avg (ms) | P95 (ms) | Frame drops |
|---|---:|---:|---:|---:|---:|
| list-10k-1pct | hrbr | 120 |  |  |  |
| list-10k-1pct | vdom | 120 |  |  |  |
| widgets-200 | hrbr | 120 |  |  |  |
| widgets-200 | vdom | 120 |  |  |  |
