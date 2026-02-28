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

## Results template

| Case | Mode | Frames | Avg (ms) | P95 (ms) | Frame drops |
|---|---:|---:|---:|---:|---:|
| list-10k-1pct | hrbr | 120 |  |  |  |
| list-10k-1pct | vdom | 120 |  |  |  |
| widgets-200 | hrbr | 120 |  |  |  |
| widgets-200 | vdom | 120 |  |  |  |
