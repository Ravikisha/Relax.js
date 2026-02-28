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
- **HRBR runtime (experimental)**: Fine-grained signals/effects, a small scheduler, compiled blocks, hydration, and a keyed DOM reconciler for dynamic structures.
- **Performance-oriented VDOM patcher**: Keyed-list optimizations (stable order, reorder/LIS), plus opt-in fast paths for large lists.

---

## CDN Links

- Relax Js - [https://ravikisha.github.io/relaxjs/relax.js](https://ravikisha.github.io/relaxjs/relax.js)
- Relax Js Minified - [https://ravikisha.github.io/relaxjs/relax.min.js](https://ravikisha.github.io/relaxjs/relax.min.js)

## Installation

Relax.js is distributed as a standalone JavaScript module. To use it in your project:

```html
<script type="module" src="https://ravikisha.github.io/relaxjs/relax.js"></script>
```

Alternatively, you can include it in your project via npm:

```bash
npm install relax.js
```

---

## Quick Start

Here is a simple example of a TODO application built with Relax.js.

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

---

## Benchmarks (browser)

This repo includes a real-browser benchmark harness that compares:

- Relax.js classic VDOM (`src/`)
- Relax.js HRBR runtime (`runtime/`)
- React and Solid adapters (for comparison)

See `docs/benchmarks.md` for methodology, how to run, and case details.

Key cases:

- `list-10k-1pct` (large keyed list, 1% row updates)
- `widgets-200` (dashboard workload)

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
    this.updateState({ todos, isLoading: false });
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
  },

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
      h('button', { on: { click: this.addTodo } }, ['Add']),
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
        })
      )
    );
  },
});

// Component: TodoItem
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
import { batch, createEffect, createSignal, untrack } from './runtime'

const [count, setCount] = createSignal(0)

const effect = createEffect(() => {
  console.log('count =', count())
})

batch(() => {
  setCount(1)
  setCount(2)
})

untrack(() => count())

effect.dispose()
```

Tests live in `runtime/__tests__/signals.test.ts`.

---

## HRBR Runtime (Phase 2): Scheduler

Phase 2 adds a small deterministic scheduler to support time-sliced work.

```ts
import { createScheduler } from './runtime'

const scheduler = createScheduler({ defaultBudgetMs: 5 })

// Lanes (highest -> lowest): sync, input, default, transition, idle
scheduler.schedule('input', () => {
  // handle user input
})

// Run work until a budget is exhausted.
scheduler.flush({ budgetMs: 2 })
```

Tests live in `runtime/__tests__/scheduler.test.ts` and a small usage example is in `examples/scheduler/basic.ts`.

---

## HRBR Runtime (Phase 3+): Blocks, Hydration, and Fallback Reconciliation

The `runtime/` folder also includes higher-level primitives used by the examples and benchmarks:

- **Blocks** (`defineBlock`, `mountBlock`, `mountCompiledBlock`) in `runtime/block.ts`
  - A block is a static HTML template with *named slots* that update without VDOM diffing.
- **Hydration (V1)** (`hydrateBlock`) in `runtime/hydration.ts`
  - Attaches to server-rendered markup and resolves slot node references.
  - On mismatch, it bails out and remounts client-side.
- **Fallback reconciler** (`mountFallback`, `reconcileChildren`) in `runtime/fallback.ts` / `runtime/reconciler.ts`
  - Used for dynamic structures (conditionals/lists) where compiled blocks can’t express the shape.

Examples:

- `examples/dashboard/` (200 widgets, blocks vs VDOM)
- `examples/list/` (10k list, HRBR fallback vs VDOM)
- `examples/ssr-hydration/` (server render + hydrate + reactive updates)

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

## VDOM list optimizations (advanced)

Relax’s VDOM patcher is tuned for keyed lists and in-place updates:

- Stable keyed same-order fast path
- Keyed reorder using a key→index map + LIS (minimizes DOM moves)

There are also a couple of internal/advanced escape hatches that are useful for benchmarks and hotspot tuning:

- **Row text-only patching**: set `_textOnly: true` on elements like `<li>{text}</li>` to patch only the child text node.
- **Large keyed list reconciliation**: set `_reconcile: 'hrbr'` on a keyed list container to delegate child ordering to the HRBR keyed reconciler.
  - Internally this uses DOM range markers, so fragment-root components inside the list are supported.

Notes:

- `_textOnly` and `_reconcile` are not part of the public API promise yet; consider them experimental.

---

## Contributing
We welcome contributions! Feel free to submit issues or pull requests on our [GitHub repository](https://github.com/your-repo/relax.js).

---

## License
Relax.js is licensed under the MIT License.

