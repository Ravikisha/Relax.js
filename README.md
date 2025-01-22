![Logo](https://ravikisha.github.io/assets/relaxjslogo.png)

# Relax.js

Relax.js is a lightweight and modern frontend framework designed to simplify building dynamic web applications using a virtual DOM and a component-based architecture. It incorporates efficient DOM updates, declarative state management, and a powerful API to build scalable UIs.

---

## Features

- **Virtual DOM**: Efficiently calculates and applies minimal changes to the DOM.
- **Reconciliation Algorithm**: Updates the browser’s DOM to reflect the application state changes efficiently.
- **Component-Based Architecture**: Build reusable, isolated components with encapsulated state and logic.
- **State Management**: Built-in reactive state management for declarative UI updates.
- **Lifecycle Hooks**: Execute code at specific points in a component’s lifecycle.
- **Event Handling**: Bind and emit events with ease.
- **Fragments**: Group multiple elements without introducing additional DOM nodes.

---

## Installation

Relax.js is distributed as a standalone JavaScript module. To use it in your project:

```html
<script type="module" src="path-to-relax.js"></script>
```

Alternatively, you can include it in your project via npm:

```bash
npm install relax.js
```

---

## Quick Start

Here is a simple example of a TODO application built with Relax.js.

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

## License
Relax.js is licensed under the MIT License.

