export type BenchmarkResult = {
	name: string
	samplesMs: number[]
	avgMs: number
	p95Ms: number
	frames: number
	frameDrops: number
}

export type BenchmarkCase = {
	name: string
	setup(host: HTMLElement): { tick(): void | Promise<void>; teardown(): void }
	/**
	 * Optional barrier that resolves only once the framework has committed its updates
	 * for the current tick (e.g. after React flushes/paints).
	 */
	commit?: () => void | Promise<void>
}

export type RunBenchmarkOptions = {
	warmupFrames?: number
	measureFrames?: number
	/** count a "drop" when work exceeds this budget */
	frameBudgetMs?: number
}

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0
	const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))
	return sorted[idx]!
}

function now(): number {
	return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function nextFrame(): Promise<void> {
	if (typeof requestAnimationFrame !== 'undefined') {
		return new Promise((r) => requestAnimationFrame(() => r()))
	}
	// Node/jsdom fallback: approximate.
	return new Promise((r) => setTimeout(() => r(), 16))
}

export async function runBenchmark(
	b: BenchmarkCase,
	host: HTMLElement,
	options: RunBenchmarkOptions = {}
): Promise<BenchmarkResult> {
	const warmupFrames = options.warmupFrames ?? 30
	const measureFrames = options.measureFrames ?? 120
	const frameBudgetMs = options.frameBudgetMs ?? 16.7

	const ctrl = b.setup(host)

	// Warmup
	for (let i = 0; i < warmupFrames; i++) {
		await nextFrame()
		await ctrl.tick()
		if (b.commit) await b.commit()
	}

	const samples: number[] = []
	let drops = 0

	for (let i = 0; i < measureFrames; i++) {
		await nextFrame()
		const t0 = now()
		await ctrl.tick()
		if (b.commit) await b.commit()
		const dt = now() - t0
		samples.push(dt)
		if (dt > frameBudgetMs) drops++
	}

	ctrl.teardown()

	const avg = samples.reduce((a, x) => a + x, 0) / (samples.length || 1)
	const sorted = samples.slice().sort((a, b2) => a - b2)
	const p95 = percentile(sorted, 0.95)

	return {
		name: b.name,
		samplesMs: samples,
		avgMs: avg,
		p95Ms: p95,
		frames: samples.length,
		frameDrops: drops,
	}
}
