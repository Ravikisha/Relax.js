import { h, hFragment } from '../h'
import { defineComponent } from '../component'

function fetchTodos(): Promise<string[]> {
  return new Promise((resolve) => {
    resolve(['Water the plants', 'Walk the dog'])
  })
}

export const App = defineComponent({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state(props: any = {}) {
    const todos: string[] = Array.isArray(props.todos) ? props.todos : []
    return { todos, isLoading: true }
  },

  async onMounted() {
    const todos = await fetchTodos()
    this.updateState({ todos, isLoading: false })
  },

  render() {
    const { isLoading, todos } = this.state as { isLoading: boolean; todos: string[] }

    if (isLoading) {
      return h('p', {}, ['Loading...'])
    }

    return hFragment([
      h('h1', {}, ['Todos']),
      h(AddTodo, { on: { addTodo: this.addTodo } }),
      h(TodosList, {
        todos: todos,
        on: { removeTodo: this.removeTodo },
      }),
    ])
  },

  addTodo(description: string) {
  const state = (this.state as unknown as { todos?: string[] })
    this.updateState({
      todos: [...(state.todos ?? []), description],
    })
  },

  removeTodo(index: number) {
    const todos = ((this.state as any)?.todos ?? []) as string[]
    this.updateState({
      todos: [...todos.slice(0, index), ...todos.slice(index + 1)],
    })
  },
})

const AddTodo = defineComponent({
  state() {
    return {
      description: '',
    }
  },

  render() {
    return hFragment([
      h('input', {
        type: 'text',
        value: (this.state as any).description,
        on: { input: this.updateDescription },
      }),
      h('button', { on: { click: this.addTodo } }, ['Add']),
    ])
  },

  updateDescription({ target }: Event) {
    const input = target as HTMLInputElement
    this.updateState({ description: input.value })
  },

  addTodo() {
    this.emit('addTodo', (this.state as any).description)
    this.updateState({ description: '' })
  },
})

const TodosList = defineComponent({
  render() {
    const { todos } = this.props as { todos: string[] }

    return h(
      'ul',
      {},
      todos.map((description, index) =>
        h(TodoItem, {
          description,
          key: description,
          index,
          on: { removeTodo: (idx: number) => this.emit('removeTodo', idx) },
        })
      )
    )
  },
})

const TodoItem = defineComponent({
  render() {
    const { description } = this.props as { description: string }

    return h('li', {}, [
      h('span', {}, [description]),
      h('button', { on: { click: this.removeTodo } }, ['Done']),
    ])
  },

  removeTodo() {
    this.emit('removeTodo', (this.props as any).index)
  },
})
