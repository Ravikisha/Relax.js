import type { BenchmarkCase } from '../harness'
import { mountDashboard200HRBR } from '../../examples/dashboard/hrbr'
import { mountDashboard200VDOM } from '../../examples/dashboard/vdom'

export function widgets200HRBR(): BenchmarkCase {
	return {
		name: 'widgets-200:relax-hrbr',
		setup(host) {
			const ctrl = mountDashboard200HRBR(host, 200)
			return {
				tick: () => ctrl.update1pct(),
				teardown: () => ctrl.dispose(),
			}
		},
	}
}

export function widgets200VDOM(): BenchmarkCase {
	return {
		name: 'widgets-200:relax-vdom',
		setup(host) {
			const ctrl = mountDashboard200VDOM(host, 200)
			return {
				tick: () => ctrl.update1pct(),
				teardown: () => ctrl.dispose(),
			}
		},
	}
}
