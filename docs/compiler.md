# HRBR compiler (Babel transform)

> Date: 2026-02-28
>
> Status: Draft (v1)

This document describes the HRBR JSX compiler/transform and the current supported subset.

---

## What the transform produces

The transform compiles a JSX expression into something that can be mounted into a host element.

Conceptually it emits:

- a hoisted `defineBlock({ templateHTML, slots })` definition
- a mount factory: `(host) => mountCompiledBlock(def, host, compiledSlots, options?)`

In Relax VDOM interop, compiled output is wrapped as an HRBR vnode (see `src/h.ts` `hBlock()`).

---

## Supported JSX subset (v1)

### Intrinsic elements

Supported:

- intrinsic tags like `<div>`, `<span>`, `<button>`, `<svg>`
- nested intrinsic elements
- static attributes
- dynamic attributes that can be represented as slots

### Dynamic values (slots)

Supported dynamic values are compiled into slots:

- text children: `<div>{expr}</div>` => `text` slot
- attributes: `<a href={expr} />` => `attr` slot
- properties: `<input value={expr} />` and `<input checked={expr} />` => `prop` slot
- class: `<div className={expr} />` => `class` slot
- style: `<div style={expr} />` => `style` slot

Event handlers (`onClick`, etc.) are intentionally not supported in block mode yet (see below).

---

## Fallback routing rules

If the compiler sees **dynamic structure**, it emits a fallback region.

Examples that route to fallback:

- `{cond && <div/>}`
- `{items.map(...)}`
- fragments that depend on runtime values
- spreads (e.g. `<div {...props} />`) because attribute sets are not statically known

Fallback regions are reconciled by `runtime/fallback.ts` + `runtime/reconciler.ts`.

---

## Current intentional errors (v1)

Block compilation throws (with a helpful error) for:

- event handlers like `onClick={...}`
- spread attributes
- fragments (`<>...</>`)
- non-intrinsic tags (components)

These can still be supported by routing to fallback, but the roadmap currently keeps this strict to make block semantics crisp.

---

## Lane pragmas

The transform supports lane metadata via a comment pragma:

- `/*@lane transition*/`

This metadata is used by the runtime to schedule updates through the HRBR scheduler lanes.

---

## Debugging tips

- In dev mode, slot keys are location-based for stability across rebuilds.
- At runtime, `mountBlock(def, host, values, { dev: true })` includes the slot key in invalid path errors.

