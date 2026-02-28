import { describe, expect, it } from 'vitest'
import { compileTSXOrFallback, compileTSXToBlock } from '../index'

function stable(obj: unknown) {
  return JSON.parse(JSON.stringify(obj))
}

describe('compiler (phase 5): snapshots', () => {
  it('emits template + slots for dynamic class/style/attr/prop and sets meta flags', () => {
    const { block, meta } = compileTSXToBlock(`(
      <div className={/*@lane transition*/ cls()} style={{ color: color() }} data-x={x()}>
        <input value={val()} />
      </div>
    )`)

    expect(block.templateHTML).toMatchInlineSnapshot(
    '"<div class=\"\" style=\"\" data-x=\"\"><input value=\"\"></div>"'
    )

    expect(stable(block.slots)).toMatchInlineSnapshot(`{
  "s0": {
    "kind": "class",
    "path": [],
  },
  "s1": {
    "kind": "style",
    "path": [],
  },
  "s2": {
    "kind": "attr",
    "name": "data-x",
    "path": [],
  },
  "s3": {
    "kind": "prop",
    "name": "value",
    "path": [],
  },
}`)
  })

  it('flags dynamic structure for expression children (conditionals/lists)', () => {
  const res = compileTSXOrFallback(`(<div>{cond() ? <span /> : null}</div>)`)
  expect(res.kind).toBe('fallback')
  expect(res.meta.hasDynamicStructure).toBe(true)
  })

  it('routes to fallback when dynamic structure is detected', () => {
    const res = compileTSXOrFallback(`(<div>{items().map(x => <span>{x}</span>)}</div>)`)
    expect(res.kind).toBe('fallback')
    if (res.kind === 'fallback') {
      expect(res.reason).toBe('dynamic-structure')
      expect(res.meta.hasDynamicStructure).toBe(true)
    }
  })
})
