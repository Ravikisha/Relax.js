# HRBR whitepaper (v1)

> Date: 2026-02-28
>
> Status: Draft (v1)

HRBR is an experimental fast-path runtime for Relax.js that compiles JSX into a **static template** plus a list of **slot updates**.

At a high level:

- The compiler extracts a `templateHTML` string that describes the static DOM shape.
- Dynamic values become *slots* (text, attributes, properties, class, style, events).
- At runtime, `mountBlock()` clones the template once and only applies the minimal slot writes during updates.
- If the compiler detects **dynamic structure** (loops/conditionals/spreads/etc), it routes that region to the fallback reconciler.

This document explains the mental model and the key invariants.

---

## 1. Terms

### Block

A **block** is the compiled representation of a DOM subtree with a stable structure.

A block is defined by:

- `templateHTML`: an HTML string with a single root element
- `slots`: a `Record<string, BlockSlot>` describing dynamic locations

### Slot

A **slot** is a dynamic write into the cloned DOM.

Relax.js HRBR defines slot kinds:

- `text`: update a `Text` node
- `attr`: set/remove an attribute
- `prop`: set a JS property (not an attribute)
- `class`: set/remove the `class` attribute
- `style`: set/remove `style` or update style properties
- `event`: attach a listener once and update the current handler

Each slot has a `path: number[]` which is an index-walk over `childNodes` from the block root.

### Dynamic structure

**Dynamic structure** means the *shape* of the DOM can change across renders:

- `{cond && <div/>}`
- `{items.map(...)}`
- fragments that depend on runtime values
- JSX spreads that may add/remove attributes unpredictably

When dynamic structure is detected, the compiler emits a fallback region.

---

## 2. Runtime invariants

HRBR’s speed comes from a few strict invariants:

1) **Template structure is stable.**
	`templateHTML` must describe a subtree whose *node types / element tag names* remain stable.

2) **Slot paths are deterministic and validated.**
	A slot path walks `childNodes`. The runtime resolves slot nodes once on mount/hydrate.

3) **Updates are local writes.**
	An update is a map `{ [slotKey]: value }` and results only in writes for those slots.

4) **Coalescing is allowed.**
	The runtime may skip DOM writes when the new value is `Object.is` equal to the previous value.

---

## 3. Hydration (v1 semantics)

Hydration is conservative in v1:

- `hydrateBlock(def, host)` assumes `host` contains exactly one root element.
- It resolves slot nodes against the server DOM.
- It validates along slot paths:
  - `text` slots map to `Text` nodes
  - non-text slots map to `Element` nodes
  - element tag names match the template shape

On mismatch, hydration bails out and remounts client-side.

---

## 4. Fallback interop

The fallback reconciler is used when the compiler can’t guarantee structure stability.

The contract:

- You provide a list of logical child items.
- Items may be keyed.
- Items may be a **range** (one logical item expands to multiple DOM nodes).

This lets HRBR still handle real-world fragments/components safely.

---

## 5. Design goals

- **Fast mounts** (clone template once)
- **Fast updates** (only slot writes)
- **Deterministic scheduling** (lanes + budgets)
- **Safe hydration** (validate then attach; bail out on mismatch)

---

## 6. Non-goals (v1)

- Perfect minimal-DOM-op hydration diffs on mismatch (v1 uses conservative bailouts)
- A DOM-free string renderer (v1 SSR uses a DOM-based approach for tests/examples)

This will become the architectural whitepaper for the Hybrid Reactive Block Runtime:
- hybrid block + reactive graph execution model
- scheduler lanes + deterministic latency budgets (novel feature)
- SSR hydration strategy
- complexity analysis (VDOM O(n) vs Block O(k) vs Signals O(d))

_Status: scaffold._
