import { createApp, defineComponent } from '../../src/index'
import { nextTick } from '../../src/scheduler'

const Hello = defineComponent({
  render() {
    const name = 'Relax'
    return <div class={['hello']}>Hello {name}</div>
  },
})

export async function runHelloExample(host: HTMLElement) {
  const app = createApp(Hello)
  app.mount(host)
  await nextTick()
  return host.innerHTML
}
