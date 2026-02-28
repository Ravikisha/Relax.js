import type { BenchmarkCase } from '../harness'
import {
	reactList10k1pct,
	reactWidgets200,
	solidList10k1pct,
	solidWidgets200,
	type ExternalBenchCommitController,
} from './react-solid-adapters'

export function list10k1pctReact(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'list-10k-1pct:react',
		setup(host) {
			ctrl = reactList10k1pct(host, 10_000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => {
					ctrl?.dispose()
					ctrl = null
				},
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function list10k1pctSolid(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'list-10k-1pct:solid',
		setup(host) {
			ctrl = solidList10k1pct(host, 10_000)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => {
					ctrl?.dispose()
					ctrl = null
				},
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function widgets200React(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'widgets-200:react',
		setup(host) {
			ctrl = reactWidgets200(host, 200)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => {
					ctrl?.dispose()
					ctrl = null
				},
			}
		},
		commit: () => ctrl?.commit(),
	}
}

export function widgets200Solid(): BenchmarkCase {
	let ctrl: ExternalBenchCommitController | null = null
	return {
		name: 'widgets-200:solid',
		setup(host) {
			ctrl = solidWidgets200(host, 200)
			return {
				tick: () => ctrl!.update1pct(),
				teardown: () => {
					ctrl?.dispose()
					ctrl = null
				},
			}
		},
		commit: () => ctrl?.commit(),
	}
}
