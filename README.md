![Logo](https://ravikisha.github.io/assets/relaxjslogo.png)

# Relax.js

Relax.js is a teaching-first UI library and runtime.

It ships:

- a small Virtual DOM (VDOM) + component model
- an experimental next-gen runtime called **HRBR** (signals, deterministic scheduling, compiled blocks)
- a minimal **Static Site Generator (SSG)** built on top of Relax VNodes

This repo also includes a full PDF book that walks through the implementation.

## Download the book

- **Relax.js Book (PDF)**: [`Relax.js Book.pdf`](./Relax.js%20Book.pdf)

## Package name (important)

Published package name (per `package.json`) is **`relaxcore`**.

In code, you typically import from `relaxcore`.

## Install

```bash
npm install relaxcore
```

## Quick start (VDOM)

```ts
import { createApp, defineComponent, h } from 'relaxcore'

const App = defineComponent({
  render() {
    return h('h1', {}, ['Hello from Relax'])
  },
})

createApp(App).mount(document.getElementById('app')!)
```

## TSX / JSX (React-like syntax)

Relax supports TSX using TypeScript’s `react-jsx` transform with:

- `jsx: "react-jsx"`
- `jsxImportSource: "relax-jsx"`

Supported React-like bits:

- `className` maps to `class`
- `onClick` / `onInput` / … map to `on: { click/input/... }`
- fragments via `<>...</>`

Example:

```tsx
import { createApp, defineComponent } from 'relaxcore'

const App = defineComponent({
  render() {
    return (
      <>
        <h1 className="title">Hello</h1>
        <button onClick={() => console.log('clicked')}>Click</button>
      </>
    )
  },
})

createApp(App).mount(document.getElementById('app')!)
```

Related tests:

- `src/__tests__/jsx-tsx.test.ts`
- `src/__tests__/jsx-react-syntax.test.tsx`

## Static Site Generator (SSG)

The SSG is intentionally minimal and deterministic:

- Markdown (`.md`) → HTML pages
- YAML-ish frontmatter (`--- ... ---`) → page `data` (`title`, `description`, `layout`, ...)
- Clean URLs (`about.md` → `/about/` via `about/index.html`)
- Optional `public/` asset copy
- Optional `sitemap.xml`

### CLI

This package exposes a CLI:

```bash
relax-ssg <inputDir> <outputDir>
```

Configuration options:

- Environment variables:
  - `RELAX_SSG_BASE_URL` → generate `sitemap.xml`
  - `RELAX_SSG_CLEAN_URLS` → `always` (default) | `never`
  - `RELAX_SSG_PUBLIC_DIR` → defaults to `<inputDir>/public` if present
  - `RELAX_SSG_SITE_NAME` → used by the default layout
  - `RELAX_SSG_DEFAULT_LAYOUT` → default layout name
  - `RELAX_SSG_CONFIG` → config path override
- Config file (default): `relax.ssg.config.js`

Frontmatter example:

```md
---
title: About
description: About this site
layout: default
---

# Hello
```

### Library API

```ts
import { markdownToPage, renderPageToString } from 'relaxcore/ssg'

const page = await markdownToPage('---\ntitle: Hi\n---\n\n# Hello', { frontmatter: true })
const rendered = renderPageToString(page.vdom, page.data)
console.log(rendered.html)
```

## Public API surface

Top-level exports (see `src/index.ts`):

- `createApp`
- `defineComponent`
- `h`, `hFragment`, `hSlot`, `hString`, `DOM_TYPES`
- `nextTick`

SSG exports:

- `relaxcore/ssg` → `markdownToPage`, `renderPageToString`, `renderSitemapXml`, config helpers, etc.

HRBR exports:

- `relaxcore/hrbr`

Compiler exports:

- `relaxcore/compiler`

## Repo workflows (production-ready)

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Publishing safety:

- `prepack` runs `build` + `build:types` automatically.
- `files` only includes `dist/` and `dist-types/`.

## License

MIT. See [`LICENSE`](./LICENSE).

## Contributing

Issues and PRs are welcome.

- Bugs / feature requests: https://github.com/ravikisha/Relax.js/issues


```ts
import { batch, createEffect, createMemo, createSignal, untrack } from './runtime'

const [count, setCount] = createSignal(0)

const effect = createEffect(() => {
  console.log('count =', count())
})

const doubled = createMemo(() => count() * 2)
createEffect(() => {
  console.log('doubled =', doubled())
})

// Optionally schedule effects through the deterministic scheduler
createEffect(
  () => {
    console.log('scheduled doubled =', doubled())
  },
  { lane: 'default', budgetMs: 5, name: 'log-doubled' }
)

batch(() => {
  setCount(1)
  setCount(2)
})

untrack(() => count())

effect.dispose()
```

Notes:
- `dispose()` fully detaches the effect from all tracked signals/memos, so later writes won't reschedule it.
- If an effect writes to a signal it reads, it won't recursively re-enter; it will schedule another run after the current one unwinds.

Tests live in `runtime/__tests__/signals.test.ts`. Property/fuzz coverage lives in `runtime/__tests__/signals.fuzz.test.ts` (seeded PRNG helper: `runtime/__tests__/prng.ts`). Determinism/leak-oriented coverage lives in `runtime/__tests__/signals.determinism.test.ts`.

---

## HRBR Runtime (Phase 2): Scheduler

Phase 2 adds a small deterministic scheduler to support time-sliced work.

Determinism rules (current):

- Across lanes: tasks run by lane priority: `sync > input > default > transition > idle`.
- Within a lane: tasks are ordered by `(deadline, timestamp, id)`.
- Starvation prevention: if a lane's **head** task waits longer than the aging threshold, exactly **one** head
  task is promoted one step toward higher priority before picking the next task.
- Deadlines: a task may be scheduled with an explicit absolute `deadline` (in `now()` units). When the head
  task in a low-priority lane is **overdue**, it is eligible for promotion even if it hasn't aged long enough.

```ts
import { createScheduler } from './runtime'

const scheduler = createScheduler({ defaultBudgetMs: 5 })

// Lanes (highest -> lowest): sync, input, default, transition, idle
scheduler.schedule('input', () => {
  // handle user input
})

// Run work until a budget is exhausted.
scheduler.flush({ budgetMs: 2 })

// Budget helpers
import { withBudget, setFrameBudget } from './runtime'
setFrameBudget(5)
withBudget(2, () => {
  // do expensive user work...
})

// Browser flush strategies
import { createBrowserScheduler } from './runtime'

const browserScheduler = createBrowserScheduler({
  strategy: 'messageChannel', // 'timeout' | 'messageChannel' | 'raf'
  defaultBudgetMs: 5,
})
```

Tests live in `runtime/__tests__/scheduler.test.ts` and a small usage example is in `examples/scheduler/basic.ts`.

---

## HRBR Runtime (Phase 3): Compiled blocks (template + slots)

Phase 3 mounts a compiled `BlockDef` (static HTML + a list of dynamic slots) and updates DOM nodes directly.

Slot semantics (current):

- `event` slots: handlers are bound once per node and updates swap the handler without leaking listeners.
- Boolean attributes: treated as present/absent (e.g. `disabled={true}` sets the attribute, `false`/`null` removes it).
- Input props: `value` and `checked` are applied via DOM properties for correct control behavior.
- SVG namespaces: supports `xlink:*` attributes using the xlink namespace.

Tests live in `runtime/__tests__/block.test.ts`.

## HRBR Compiler (Babel JSX transform)

The experimental HRBR compiler includes a Babel JSX transform that compiles a small JSX subset into **compiled blocks** (template + slots) for the HRBR runtime.

### Dev mode (stable slot keys)

When you pass `{ dev: true }` to the plugin options, the transform emits **stable, location-based slot keys** (e.g. `s_text_12:8`). This makes generated output easier to inspect and keeps debug logs/snapshots much more readable.

### Source maps

Source maps are produced by Babel (not the plugin). Enable them in your toolchain (for example `sourceMaps: true` in `@babel/core`) and you’ll get mappings back to the original `.tsx`.

### Supported subset (current)

- Intrinsic lowercase tags only (e.g. `<div>`, `<span>`)
- Static text + dynamic **text slots** (`<p>Hello {name()}</p>`)
- Dynamic attribute slots (including `className`, `style`, and general attributes)

### Lane annotations (experimental)

You can annotate a dynamic slot with a lane pragma inside the JSX expression:

```tsx
const App = () => (
  <div className={/*@lane transition*/ cls()} data-x={/*@lane input*/ x()}>
    {name()}
  </div>
)
```

This currently emits a per-slot `lane` hint in the compiled block metadata.

### Current limitations

Block mode can't represent constructs that require structural reconciliation (dynamic DOM presence/order). The compiler now routes these cases to the **fallback reconciler** via `mountFallback(...)`:

- Expression children with dynamic structure (conditionals / logical expressions)
- List rendering patterns (as they’re supported in fallback output)

Some constructs are still rejected with a helpful compile-time error:

- Event handlers like `onClick={...}`
- Spread attributes `{...props}`
- Fragments `<>...</>`
- Components / non-intrinsic tags like `<Foo />`

When a construct can’t be compiled to blocks *or* represented by the fallback MVP, the transform throws a helpful compile-time error.

#### `this.updateState(newState)`
Updates the component's state and triggers a re-render.
- `newState`: An object representing the updated state.

#### `this.emit(eventName, payload)`
Emits a custom event to the parent component.
- `eventName`: The name of the event.
- `payload`: Optional data to pass with the event.

---

## Key Concepts

### Virtual DOM
Relax.js uses a virtual DOM to calculate the minimal set of changes required to update the actual DOM, ensuring efficient rendering.

### State Management
State is managed locally within each component and can be updated using `this.updateState`. Changes to the state automatically re-render the component.

### Lifecycle Hooks
- `onMounted`: Called after the component is mounted to the DOM.
- `onUpdated`: Called after the component's state or props are updated.

### Props
Components receive data from their parent through props, available in `this.props`.

### Event Handling
Event handlers can be defined in props using the `on` object. Custom events can be emitted using `this.emit`.

### Fragments
Use `hFragment` to group multiple elements without introducing an additional DOM node.

---

## Contributing
We welcome contributions! Feel free to submit issues or pull requests on our [GitHub repository](https://github.com/your-repo/relax.js).

---

## Versioning & compatibility policy

This repo currently ships two “layers”:

- **Relax VDOM** (stable): the existing VDOM + component runtime.
- **HRBR** (experimental): signals + deterministic scheduler + compiled blocks + fallback reconciler + compiler.

### SemVer policy (current)

- **Patch** releases (`x.y.z+1`) may include bug fixes and performance improvements that don’t require user code changes.
- **Minor** releases (`x.y+1.0`) may add new APIs or expand supported behavior in a backwards-compatible way.
- **Major** releases (`x+1.0.0`) may include breaking changes.

HRBR-specific APIs are still evolving; until HRBR is explicitly declared stable in the docs, **minor releases may include breaking changes in `./hrbr` and `./compiler`**. When that happens, it’ll be called out in release notes.

### HRBR compiler: when we emit blocks vs fallback

The Babel JSX transform tries to compile a small subset of JSX into **compiled blocks** (`defineBlock(...)` + `mountCompiledBlock(...)`).

It will route to **fallback** (`mountFallback(...)`) when we detect **dynamic structure**, i.e. cases that can change DOM presence/order.

Rules of thumb (current):

- **Block mode** for: intrinsic lowercase tags, mostly-static structure, dynamic values as **slots** (text/attrs/props/class/style).
- **Fallback mode** for: expression children that introduce conditionals/lists or otherwise require structural reconciliation.
- **Compile error** for: constructs we don’t support in either mode yet (events, spreads, fragments, components).

This behavior is covered by tests under `compiler/__tests__/` (notably the fallback e2e test).

---

## License
Relax.js is licensed under the MIT License.

