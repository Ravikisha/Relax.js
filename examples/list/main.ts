import { mountList10k1pctHRBR } from './hrbr'
import { mountList10k1pctVDOM } from './vdom'

type Controller = { update1pct(): void; dispose(): void }

const host = document.getElementById('host') as HTMLElement
const modeSel = document.getElementById('mode') as HTMLSelectElement
const mountBtn = document.getElementById('mount') as HTMLButtonElement
const updateBtn = document.getElementById('update') as HTMLButtonElement
const unmountBtn = document.getElementById('unmount') as HTMLButtonElement

let ctrl: Controller | null = null

function setState(isMounted: boolean) {
	mountBtn.disabled = isMounted
	updateBtn.disabled = !isMounted
	unmountBtn.disabled = !isMounted
	modeSel.disabled = isMounted
}

mountBtn.addEventListener('click', () => {
	if (ctrl) return
	host.innerHTML = ''

	ctrl = modeSel.value === 'vdom' ? mountList10k1pctVDOM(host) : mountList10k1pctHRBR(host)
	setState(true)
})

updateBtn.addEventListener('click', () => {
	ctrl?.update1pct()
})

unmountBtn.addEventListener('click', () => {
	ctrl?.dispose()
	ctrl = null
	host.innerHTML = ''
	setState(false)
})

setState(false)
