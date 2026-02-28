// Small deterministic PRNG for repeatable property/fuzz tests.
// (Mulberry32: good enough for tests, tiny, stable across JS engines.)

export type PRNG = {
  next(): number
  int(maxExclusive: number): number
  bool(): boolean
  pick<T>(arr: readonly [T, ...T[]]): T
}

export function createPRNG(seed: number): PRNG {
  let a = seed >>> 0
  function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(maxExclusive) {
      return Math.floor(next() * maxExclusive)
    },
    bool() {
      return next() < 0.5
    },
    pick(arr) {
  return arr[this.int(arr.length)]!
    },
  }
}
