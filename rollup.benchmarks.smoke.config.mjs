import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'

export default defineConfig({
	input: 'benchmarks/perf-smoke.ts',
	output: {
		dir: 'benchmarks/dist-smoke',
		format: 'es',
		sourcemap: true,
		entryFileNames: 'perf-smoke.js',
	},
	plugins: [
		replace({
			preventAssignment: true,
			values: {
				// eslint-disable-next-line no-process-env
				'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
			},
		}),
		resolve({ browser: true }),
		commonjs(),
		typescript({
			tsconfig: './tsconfig.json',
			declaration: false,
			declarationMap: false,
			outDir: 'benchmarks/dist-smoke',
		}),
	],
})
