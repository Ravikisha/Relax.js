import { describe, expect, it } from 'vitest'
import { compileTSXToBlock } from '../index'
import { createSignal } from '../../runtime/signals'
import { mountCompiledBlock } from '../../runtime/block'

function stripWs(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

describe('compiler (phase 5 MVP)', () => {
  it('compiles simple TSX into a BlockDef and mounts', () => {
    const host = document.createElement('div')
    const [name, setName] = createSignal('Ada')

    const { block } = compileTSXToBlock(`(<div className={name()}>Hello</div>)`)

    const mounted = mountCompiledBlock(block, host, [{ key: 's0', read: () => name() }])

  const div = host.firstElementChild as HTMLDivElement
    expect(div).toBeTruthy()
    expect(stripWs(div.outerHTML)).toBe('<div class="Ada">Hello</div>')

  mounted.dispose()
  })
})
