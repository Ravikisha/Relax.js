import type { BenchmarkCase } from '../harness'
import type { BenchmarkProfile } from '../profile'
import { mountList10k1pctHRBR, mountList10k1pctHRBRFine } from '../../examples/list/hrbr'
import { mountList10k1pctVDOM, mountList10k1pctVDOMMemoRow } from '../../examples/list/vdom'

export function list10k1pctHRBR(_profile?: BenchmarkProfile): BenchmarkCase {
	return {
		name: 'list-10k-1pct:relax-hrbr',
		setup(host) {
			const ctrl = mountList10k1pctHRBR(host, 10_000)
			return {
				tick: () => ctrl.update1pct(),
				teardown: () => ctrl.dispose(),
			}
		},
	}
}

export function list10k1pctVDOM(_profile?: BenchmarkProfile): BenchmarkCase {
	return {
		name: 'list-10k-1pct:relax-vdom',
		setup(host) {
			const ctrl = mountList10k1pctVDOM(host, 10_000)
			return {
				tick: () => ctrl.update1pct(),
				teardown: () => ctrl.dispose(),
			}
		},
	}
}

export function list10k1pctVDOMDirect(_profile?: BenchmarkProfile): BenchmarkCase {
	return {
		name: 'list-10k-1pct:relax-vdom-direct',
		setup(host) {
			const ctrl = mountList10k1pctVDOM(host, 10_000, { useApp: false })
			return {
				tick: () => ctrl.update1pct(),
				teardown: () => ctrl.dispose(),
			}
		},
	}
}

export function list10k1pctHRBRFineCase(_profile?: BenchmarkProfile): BenchmarkCase {
	return {
		name: 'list-10k-1pct:relax-fine',
		setup(host) {
			const ctrl = mountList10k1pctHRBRFine(host, 10_000)
			return {
				tick: () => ctrl.update1pct(),
				teardown: () => ctrl.dispose(),
			}
		},
	}
}

export function list10k1pctVDOMMemoRowCase(_profile?: BenchmarkProfile): BenchmarkCase {
	return {
		name: 'list-10k-1pct:relax-vdom-memo-row',
		setup(host) {
			const ctrl = mountList10k1pctVDOMMemoRow(host, 10_000)
			return {
				tick: () => ctrl.update1pct(),
				teardown: () => ctrl.dispose(),
			}
		},
	}
}
