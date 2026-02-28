import { runBenchmark } from './harness'
import {
	list10k1pctHRBR,
	list10k1pctHRBRFineCase,
	list10k1pctVDOM,
	list10k1pctVDOMMemoRowCase,
} from './cases/list-10k-1pct'
import { text1mHRBR } from './cases/text-1m'
import { widgets200HRBR, widgets200VDOM } from './cases/widgets-200'
import { list10k1pctReact, list10k1pctSolid, widgets200React, widgets200Solid } from './cases/react-solid'
import {
	attrsToggle1kRelaxVDOM,
	attrsToggle1kReactCase,
	attrsToggle1kSolidCase,
	classStyle1kRelaxVDOM,
	classStyle1kReactCase,
	classStyle1kSolidCase,
	eventsSwap1kRelaxVDOM,
	eventsSwap1kReactCase,
	eventsSwap1kSolidCase,
	fragmentToggleRelaxVDOM,
	hrbrReconcile10k,
	inputType100RelaxVDOM,
	inputType100ReactCase,
	inputType100SolidCase,
	keyedRotate5kRelaxVDOM,
	keyedRotate5kReactCase,
	keyedRotate5kSolidCase,
	mixed2kRelaxVDOM,
	mountUnmount1kReactCase,
	mountUnmount1kRelaxVDOM,
	mountUnmount1kSolidCase,
	ssrHydrate100Slots,
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

			// More vivid micro+macro cases
			host.innerHTML = ''
			out.textContent += '\n' + fmt(await runBenchmark(mountUnmount1kRelaxVDOM(), host, { warmupFrames: 5, measureFrames: 60 })) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(mountUnmount1kReactCase(), host, { warmupFrames: 5, measureFrames: 60 })) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(mountUnmount1kSolidCase(), host, { warmupFrames: 5, measureFrames: 60 })) + '\n\n'

			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(keyedRotate5kRelaxVDOM(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(keyedRotate5kReactCase(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(keyedRotate5kSolidCase(), host)) + '\n\n'

			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(attrsToggle1kRelaxVDOM(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(attrsToggle1kReactCase(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(attrsToggle1kSolidCase(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(classStyle1kRelaxVDOM(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(classStyle1kReactCase(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(classStyle1kSolidCase(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(eventsSwap1kRelaxVDOM(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(eventsSwap1kReactCase(), host)) + '\n\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(eventsSwap1kSolidCase(), host)) + '\n\n'

			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(fragmentToggleRelaxVDOM(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(inputType100RelaxVDOM(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(inputType100ReactCase(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(inputType100SolidCase(), host)) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(mixed2kRelaxVDOM(), host)) + '\n\n'

			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(hrbrReconcile10k(), host, { warmupFrames: 5, measureFrames: 60 })) + '\n'
			host.innerHTML = ''
			out.textContent += fmt(await runBenchmark(ssrHydrate100Slots(), host, { warmupFrames: 5, measureFrames: 60 })) + '\n'
	} finally {
		runBtn.disabled = false
	}
})
