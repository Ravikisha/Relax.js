import { runBenchmark } from './harness'
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
	return [
		`# ${res.name}`,
		`frames: ${res.frames}`,
		`avg:   ${res.avgMs.toFixed(3)} ms`,
		`p95:   ${res.p95Ms.toFixed(3)} ms`,
		`drops: ${res.frameDrops}`,
	].join('\n')
}

runBtn.addEventListener('click', async () => {
	runBtn.disabled = true
	out.textContent = 'Running...\n'
	try {
		host.innerHTML = ''
		const t = await runBenchmark(text1mHRBR(), host, { warmupFrames: 5, measureFrames: 60 })
		out.textContent += fmt(t) + '\n\n'

		host.innerHTML = ''
		const a = await runBenchmark(list10k1pctHRBR(), host)
		out.textContent += fmt(a) + '\n\n'

		host.innerHTML = ''
		const af = await runBenchmark(list10k1pctHRBRFineCase(), host)
		out.textContent += fmt(af) + '\n\n'

		host.innerHTML = ''
		const b = await runBenchmark(list10k1pctVDOM(), host)
		out.textContent += fmt(b) + '\n'

		host.innerHTML = ''
		const bd = await runBenchmark(list10k1pctVDOMDirect(), host)
		out.textContent += '\n' + fmt(bd) + '\n'

		host.innerHTML = ''
		const bm = await runBenchmark(list10k1pctVDOMMemoRowCase(), host)
		out.textContent += '\n' + fmt(bm) + '\n'

			host.innerHTML = ''
			const br = await runBenchmark(list10k1pctReact(), host)
			out.textContent += '\n' + fmt(br) + '\n\n'

			host.innerHTML = ''
			const bs = await runBenchmark(list10k1pctSolid(), host)
			out.textContent += fmt(bs) + '\n'

		host.innerHTML = ''
		const c = await runBenchmark(widgets200HRBR(), host)
		out.textContent += '\n' + fmt(c) + '\n\n'

		host.innerHTML = ''
		const d = await runBenchmark(widgets200VDOM(), host)
		out.textContent += fmt(d) + '\n'

			host.innerHTML = ''
			const dr = await runBenchmark(widgets200React(), host)
			out.textContent += '\n' + fmt(dr) + '\n\n'

			host.innerHTML = ''
			const ds = await runBenchmark(widgets200Solid(), host)
			out.textContent += fmt(ds) + '\n'

			// ---- Additional vivid comparisons ----
			host.innerHTML = ''
			out.textContent += '\n'
			out.textContent += fmt(await runBenchmark(propsToggle5kRelaxVDOM(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(propsToggle5kRelaxHRBR(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(propsToggle5kReact(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(propsToggle5kSolid(), host)) + '\n\n'

			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(styleGrid1kRelaxVDOM(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(styleGrid1kReact(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(styleGrid1kSolid(), host)) + '\n\n'

			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(table2kShuffleRelaxVDOM(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(table2kShuffleReact(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(table2kShuffleSolid(), host)) + '\n\n'

			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(svg1kRelaxVDOM(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(inputTyping1kRelaxVDOM(), host)) + '\n'
	} finally {
		runBtn.disabled = false
	}
})
