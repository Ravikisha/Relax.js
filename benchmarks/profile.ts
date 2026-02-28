export type BenchmarkProfile = {
	name: string
	warmupFrames: number
	measureFrames: number
	frameBudgetMs: number
	seed: number
}

function clampInt(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n | 0))
}

function readInt(params: URLSearchParams, key: string, fallback: number): number {
	const v = params.get(key)
	if (v == null) return fallback
	const n = Number(v)
	return Number.isFinite(n) ? (n | 0) : fallback
}

export function getBenchmarkProfile(): BenchmarkProfile {
	const url = typeof location !== 'undefined' ? new URL(location.href) : null
	const params = url?.searchParams ?? new URLSearchParams()

	const name = params.get('profile') ?? 'default'

	// Reasonable defaults: stable enough to compare locally.
	let warmupFrames = 30
	let measureFrames = 120
	let frameBudgetMs = 16.7

	// Seeded randomness: deterministic within a run and repeatable.
	// Keep it in uint32 range.
	let seed = 12345

	switch (name) {
		case 'quick':
			warmupFrames = 5
			measureFrames = 30
			break
		case 'default':
			break
		case 'stress':
			warmupFrames = 60
			measureFrames = 300
			break
	}

	warmupFrames = clampInt(readInt(params, 'warmup', warmupFrames), 0, 10_000)
	measureFrames = clampInt(readInt(params, 'frames', measureFrames), 1, 100_000)

	const budgetParam = params.get('budget')
	if (budgetParam != null) {
		const b = Number(budgetParam)
		if (Number.isFinite(b) && b > 0) frameBudgetMs = b
	}

	seed = readInt(params, 'seed', seed) >>> 0

	return { name, warmupFrames, measureFrames, frameBudgetMs, seed }
}
