import { expect, test } from 'vitest'
import { runHelloExample } from '../../examples/jsx/hello'

test('TSX: renders using Relax JSX runtime', async () => {
  document.body.innerHTML = '<div id="app"></div>'
  const host = document.getElementById('app') as HTMLElement

  const html = await runHelloExample(host)
  expect(html).toBe('<div class="hello">Hello Relax</div>')
})
