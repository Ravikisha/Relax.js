import { mountDashboard200HRBR } from './hrbr'
import { mountDashboard200VDOM } from './vdom'

type Controller = {
	update1pct(): void
	start(ms?: number): void
	stop(): void
	dispose(): void
	tick: number
}

const host = document.getElementById('host') as HTMLElement
const modeSel = document.getElementById('mode') as HTMLSelectElement
const mountBtn = document.getElementById('mount') as HTMLButtonElement
const tickBtn = document.getElementById('tick') as HTMLButtonElement
const startBtn = document.getElementById('start') as HTMLButtonElement
const stopBtn = document.getElementById('stop') as HTMLButtonElement
const unmountBtn = document.getElementById('unmount') as HTMLButtonElement
const stats = document.getElementById('stats') as HTMLSpanElement

let ctrl: Controller | null = null

function setState(isMounted: boolean) {
	mountBtn.disabled = isMounted
	modeSel.disabled = isMounted
	tickBtn.disabled = !isMounted
	startBtn.disabled = !isMounted
	stopBtn.disabled = !isMounted
	unmountBtn.disabled = !isMounted
}

function updateStats() {
	if (!ctrl) stats.textContent = ''
	else stats.textContent = `ticks: ${ctrl.tick}`
}

mountBtn.addEventListener('click', () => {
	if (ctrl) return
	host.innerHTML = ''
	ctrl = (modeSel.value === 'vdom' ? mountDashboard200VDOM(host) : mountDashboard200HRBR(host)) as any
	setState(true)
	updateStats()
})

tickBtn.addEventListener('click', () => {
	ctrl?.update1pct()
	updateStats()
})

startBtn.addEventListener('click', () => {
	ctrl?.start(200)
})

stopBtn.addEventListener('click', () => {
	ctrl?.stop()
})

unmountBtn.addEventListener('click', () => {
	ctrl?.dispose()
	ctrl = null
	host.innerHTML = ''
	setState(false)
	updateStats()
})

setState(false)
