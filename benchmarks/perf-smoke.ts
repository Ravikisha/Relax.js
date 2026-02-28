import { runBenchmark } from './harness'
import { getBenchmarkProfile } from './profile'
import { text1mHRBR } from './cases/text-1m'
import { list10k1pctHRBR } from './cases/list-10k-1pct'

type SmokeRow = {
	name: string
	frames: number
	avgMs: number
	p95Ms: number
	drops: number
}

function getHost(): HTMLElement {
	let host = document.getElementById('host') as HTMLElement | null
	if (!host) {
		host = document.createElement('div')
		host.id = 'host'
		document.body.appendChild(host)
	}
	return host
}

function emitJson(rows: SmokeRow[]) {
	// CI-friendly output via console; a workflow can redirect to an artifact.
	console.log(JSON.stringify({
		kind: 'relax:bench-perf-smoke',
		profile: getBenchmarkProfile(),
		rows,
		timestamp: new Date().toISOString(),
	}, null, 2))
}

async function main() {
	const profile = getBenchmarkProfile()
	const host = getHost()

	// Force consistent, short defaults unless explicitly overridden.
	const smokeProfile = {
		...profile,
		name: profile.name === 'default' ? 'quick' : profile.name,
		warmupFrames: profile.warmupFrames ?? 10,
		measureFrames: profile.measureFrames ?? 30,
		frameBudgetMs: profile.frameBudgetMs ?? 50,
	}

	const rows: SmokeRow[] = []

	host.innerHTML = ''
	{
		const r = await runBenchmark(text1mHRBR(smokeProfile), host, smokeProfile)
		rows.push({ name: r.name, frames: r.frames, avgMs: r.avgMs, p95Ms: r.p95Ms, drops: r.frameDrops })
	}

	host.innerHTML = ''
	{
		const r = await runBenchmark(list10k1pctHRBR(smokeProfile), host, smokeProfile)
		rows.push({ name: r.name, frames: r.frames, avgMs: r.avgMs, p95Ms: r.p95Ms, drops: r.frameDrops })
	}

	emitJson(rows)

	// Very wide non-flaky gate: only fail on obvious runaway / infinite loops.
	// Intended to catch catastrophic regressions (e.g. accidental O(n^2) DOM work).
	const MAX_AVG_MS = 250
	const MAX_P95_MS = 500
	for (const row of rows) {
		if (row.avgMs > MAX_AVG_MS || row.p95Ms > MAX_P95_MS) {
			throw new Error(
				`perf-smoke threshold exceeded for ${row.name}: avg=${row.avgMs.toFixed(1)}ms p95=${row.p95Ms.toFixed(1)}ms`
			)
		}
	}
}

main().catch((err) => {
	console.error(err)
	// CI runners should treat a thrown error / console error as failure.
	throw err
})
