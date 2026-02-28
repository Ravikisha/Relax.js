![Logo](https://ravikisha.github.io/assets/relaxjslogo.png)

# Relax.js

Relax.js is a lightweight and modern frontend library designed to simplify building dynamic web applications using a virtual DOM and a component-based architecture. It incorporates efficient DOM updates, declarative state management, and a powerful API to build scalable UIs.

Relax.js is ideal for developers who want to build interactive web applications with a simple and intuitive API. It provides a flexible and efficient way to manage state, handle events, and create reusable components and it only weighs 12KB.

---

## Features

- **Virtual DOM**: Efficiently calculates and applies minimal changes to the DOM.
- **Reconciliation Algorithm**: Updates the browser’s DOM to reflect the application state changes efficiently.
- **Component-Based Architecture**: Build reusable, isolated components with encapsulated state and logic.
- **State Management**: Built-in reactive state management for declarative UI updates.
- **Lifecycle Hooks**: Execute code at specific points in a component’s lifecycle.
- **Event Handling**: Bind and emit events with ease.
- **Fragments**: Group multiple elements without introducing additional DOM nodes.
- **TSX / JSX (React-like)**: Write UI with `className`, `onClick`, and fragments (`<>...</>`) using TypeScript’s JSX transform.

---

## CDN Links

- Relax Js - [https://ravikisha.github.io/relaxjs/relax.js](https://ravikisha.github.io/relaxjs/relax.js)
- Relax Js Minified - [https://ravikisha.github.io/relaxjs/relax.min.js](https://ravikisha.github.io/relaxjs/relax.min.js)

## Installation

Relax.js is distributed as a standalone JavaScript module. To use it in your project:

```html
<script type="module" src="https://ravikisha.github.io/relaxjs/relax.js"></script>
```


```bash
npm install relax.js
```

---

## Quick Start

Here is a simple example of a TODO application built with Relax.js.

 - **HRBR runtime (experimental)**: A next-gen mode with **signals + compiled blocks + deterministic scheduling** (work-in-progress).
 - **Benchmarks**: Browser harness comparing Relax VDOM vs HRBR vs React vs Solid.
---
## JSX / TSX (React-like syntax)

Relax.js supports TSX using TypeScript’s `react-jsx` transform with `jsxImportSource: relax-jsx`.

Supported React-like bits:
- `className` maps to Relax’s `class`
- `onClick` / `onInput` / ... map to Relax’s `on: { click/input/... }`
- fragments via `<>...</>`
Example:

```tsx
import { defineComponent, createApp } from 'relax.js'

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

Tests:

- `src/__tests__/jsx-tsx.test.ts`
- `src/__tests__/jsx-react-syntax.test.tsx`

### Example Code

```javascript
import { h, hFragment, defineComponent, createApp } from 'relax.js';

// Component: App
const App = defineComponent({
  state({ todos = [] }) {
    return { todos, isLoading: true };
  },

  async onMounted() {
    const todos = await fetchTodos();
  },

  render() {
    const { isLoading, todos } = this.state;

    if (isLoading) {
      return h('p', {}, ['Loading...']);
    }

    return hFragment([
      h('h1', {}, ['Todos']),
      h(AddTodo, { on: { addTodo: this.addTodo } }),
      h(TodosList, {
        todos: todos,
        on: { removeTodo: this.removeTodo },
      }),
    ]);
  },

  addTodo(description) {
    this.updateState({ todos: [...this.state.todos, description] });

  removeTodo(index) {
    this.updateState({
      todos: [
        ...this.state.todos.slice(0, index),
        ...this.state.todos.slice(index + 1),
      ],
    });
  },
});

// Component: AddTodo
const AddTodo = defineComponent({
  state() {
    return { description: '' };
  },

  render() {
    return hFragment([
      h('input', {
        type: 'text',
        value: this.state.description,
        on: { input: this.updateDescription },
      }),
    ]);
  },

  updateDescription({ target }) {
    this.updateState({ description: target.value });
  },
  addTodo() {
    this.emit('addTodo', this.state.description);
    this.updateState({ description: '' });
  },
});

// Component: TodosList
const TodosList = defineComponent({
  render() {
    const { todos } = this.props;

    return h(
      'ul',
      {},
      todos.map((description, index) =>
        h(TodoItem, {
          description,
          key: description,
          index,
          on: { removeTodo: (index) => this.emit('removeTodo', index) },
      )
    );
  },
});

const TodoItem = defineComponent({
  render() {
    const { description } = this.props;

    return h('li', {}, [
      h('span', {}, [description]),
      h('button', { on: { click: this.removeTodo } }, ['Done']),
    ]);
  },

  removeTodo() {
    this.emit('removeTodo', this.props.index);
  },
});

// Fetch Todos Function
function fetchTodos() {
  return new Promise((resolve) => {
    resolve(['Water the plants', 'Walk the dog']);
  });
}

// Mount the application
const app = createApp(App);
app.mount(document.getElementById('app'));
```

---

## API Reference

### Core Functions

#### `defineComponent(options)`
Defines a new component.
- `options`:
  - `state(initialState: object)` (optional): Returns the initial state object.
  - `onMounted()` (optional): Lifecycle hook called after the component is mounted.
  - `render()`: Function to return the virtual DOM representation of the component.

#### `createApp(component)`
Creates a new Relax.js application instance.
- `component`: The root component to be rendered.

#### `h(tagOrComponent, props, children)`
Creates a virtual DOM node.
- `tagOrComponent`: The tag name (e.g., `div`) or a Relax.js component.
- `props`: An object containing attributes, event handlers, or props.
- `children`: An array of child nodes or a single node.

#### `hFragment(children)`
Groups multiple nodes without creating a parent DOM element.

---

## HRBR Runtime (Phase 1): Signals

The HRBR runtime work starts with fine-grained reactivity primitives under `runtime/`.

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

