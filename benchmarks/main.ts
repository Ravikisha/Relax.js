import { runBenchmark } from './harness'
import { getBenchmarkProfile } from './profile'
import {
	list10k1pctHRBR,
	list10k1pctHRBRFineCase,
	list10k1pctVDOM,
	list10k1pctVDOMDirect,
	list10k1pctVDOMMemoRowCase,
} from './cases/list-10k-1pct'
import { text1mHRBR } from './cases/text-1m'
import { widgets200HRBR, widgets200VDOM } from './cases/widgets-200'
import { list10k1pctReact, list10k1pctSolid, widgets200React, widgets200Solid } from './cases/react-solid'
import {
	inputTyping1kRelaxVDOM,
	propsToggle5kReact,
	propsToggle5kRelaxHRBR,
	propsToggle5kRelaxVDOM,
	propsToggle5kSolid,
	styleGrid1kReact,
	styleGrid1kRelaxVDOM,
	styleGrid1kSolid,
	svg1kRelaxVDOM,
	table2kShuffleReact,
	table2kShuffleRelaxVDOM,
	table2kShuffleSolid,
} from './cases/more'

const host = document.getElementById('host') as HTMLElement
const out = document.getElementById('out') as HTMLPreElement
const runBtn = document.getElementById('run') as HTMLButtonElement

function fmt(res: Awaited<ReturnType<typeof runBenchmark>>) {
	const lines = [
		`# ${res.name}`,
		`frames: ${res.frames}`,
		`avg:   ${res.avgMs.toFixed(3)} ms`,
		`p95:   ${res.p95Ms.toFixed(3)} ms`,
		`drops: ${res.frameDrops}`,
	]

	if (res.patch) {
		lines.push('')
		lines.push('patch phases (avg ms / frame):')
		const entries = Object.entries(res.patch.perFrameAvgMs)
		entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))

		// Tiny benchmark-only summary table.
		// Sorted by biggest phase so "what to optimize next" is obvious.
		const header = `| phase | avg ms/frame | % of patch |`
		const sep = `|---|---:|---:|`
		lines.push(header)
		lines.push(sep)
		const totalPerFrame = res.patch.totalMs / (res.frames || 1)
		for (let i = 0; i < entries.length; i++) {
			const phase = entries[i]![0]
			const avg = entries[i]![1] ?? 0
			const pct = totalPerFrame > 0 ? (avg / totalPerFrame) * 100 : 0
			lines.push(`| ${phase} | ${avg.toFixed(3)} | ${pct.toFixed(1)}% |`)
		}

		lines.push(`total patch time (all frames): ${res.patch.totalMs.toFixed(3)} ms`)
	}

	return lines.join('\n')
}

function shouldCollectPatchPhases(): boolean {
	const url = typeof location !== 'undefined' ? new URL(location.href) : null
	const params = url?.searchParams ?? new URLSearchParams()
	return params.get('patchPhases') === '1'
}

runBtn.addEventListener('click', async () => {
	const profile = getBenchmarkProfile()
	runBtn.disabled = true
	out.textContent = `Running...\nprofile: ${profile.name}\nseed: ${profile.seed}\n\n`
	try {
		const collectPatchPhases = shouldCollectPatchPhases()
		if (collectPatchPhases) {
			out.textContent += 'patchPhases: enabled (hook-based)\n\n'
		}

		host.innerHTML = ''
		const t = await runBenchmark(text1mHRBR(profile), host, { ...profile, collectPatchPhases })
		out.textContent += fmt(t) + '\n\n'

		host.innerHTML = ''
		const a = await runBenchmark(list10k1pctHRBR(profile), host, { ...profile, collectPatchPhases })
		out.textContent += fmt(a) + '\n\n'

		host.innerHTML = ''
		const af = await runBenchmark(list10k1pctHRBRFineCase(profile), host, { ...profile, collectPatchPhases })
		out.textContent += fmt(af) + '\n\n'

		host.innerHTML = ''
		const b = await runBenchmark(list10k1pctVDOM(profile), host, { ...profile, collectPatchPhases })
		out.textContent += fmt(b) + '\n'

		host.innerHTML = ''
		const bd = await runBenchmark(list10k1pctVDOMDirect(profile), host, { ...profile, collectPatchPhases })
		out.textContent += '\n' + fmt(bd) + '\n'

		host.innerHTML = ''
		const bm = await runBenchmark(list10k1pctVDOMMemoRowCase(profile), host, { ...profile, collectPatchPhases })
		out.textContent += '\n' + fmt(bm) + '\n'

			host.innerHTML = ''
			const br = await runBenchmark(list10k1pctReact(profile), host, { ...profile, collectPatchPhases })
			out.textContent += '\n' + fmt(br) + '\n\n'

			host.innerHTML = ''
			const bs = await runBenchmark(list10k1pctSolid(profile), host, { ...profile, collectPatchPhases })
			out.textContent += fmt(bs) + '\n'

		host.innerHTML = ''
		const c = await runBenchmark(widgets200HRBR(profile), host, { ...profile, collectPatchPhases })
		out.textContent += '\n' + fmt(c) + '\n\n'

		host.innerHTML = ''
		const d = await runBenchmark(widgets200VDOM(profile), host, { ...profile, collectPatchPhases })
		out.textContent += fmt(d) + '\n'

			host.innerHTML = ''
			const dr = await runBenchmark(widgets200React(profile), host, { ...profile, collectPatchPhases })
			out.textContent += '\n' + fmt(dr) + '\n\n'

			host.innerHTML = ''
			const ds = await runBenchmark(widgets200Solid(profile), host, { ...profile, collectPatchPhases })
			out.textContent += fmt(ds) + '\n'

			// ---- Additional vivid comparisons ----
			host.innerHTML = ''
			out.textContent += '\n'
			out.textContent +=
				fmt(await runBenchmark(propsToggle5kRelaxVDOM(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'
			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(propsToggle5kRelaxHRBR(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'
			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(propsToggle5kReact(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'
			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(propsToggle5kSolid(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'

			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(styleGrid1kRelaxVDOM(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'
			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(styleGrid1kReact(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'
			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(styleGrid1kSolid(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'

			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(table2kShuffleRelaxVDOM(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'
			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(table2kShuffleReact(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'
			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(table2kShuffleSolid(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'

			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(svg1kRelaxVDOM(profile), host, { ...profile, collectPatchPhases })) +
				'\n\n'
			host.innerHTML = ''
			out.textContent +=
				fmt(await runBenchmark(inputTyping1kRelaxVDOM(profile), host, { ...profile, collectPatchPhases })) +
				'\n'
	} finally {
		runBtn.disabled = false
	}
})
