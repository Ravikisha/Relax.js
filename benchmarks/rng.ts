export type RNG = {
	int(maxExclusive: number): number
	float(): number
}

// Mulberry32: tiny fast deterministic PRNG for benchmarks.
// Output quality is sufficient for choosing indices.
export function createRng(seed: number): RNG {
	let a = seed >>> 0
	return {
		float() {
			a = (a + 0x6d2b79f5) >>> 0
			let t = a
			t = Math.imul(t ^ (t >>> 15), t | 1)
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296
		},
		int(maxExclusive: number) {
			if (maxExclusive <= 0) return 0
			return (this.float() * maxExclusive) | 0
		},
	}
}
