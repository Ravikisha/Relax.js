import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'

export default defineConfig({
	input: 'benchmarks/main.ts',
	output: {
		dir: 'benchmarks/dist',
		format: 'es',
		sourcemap: true,
	},
	plugins: [
		replace({
			preventAssignment: true,
			values: {
				// NOTE: benchmark build runs in-browser, but some libs read NODE_ENV at bundle-time.
				// Default to production if not specified.
				// eslint-disable-next-line no-process-env
				'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
				// eslint-disable-next-line no-process-env
				RELAX_DEV: JSON.stringify((process.env.NODE_ENV ?? 'production') !== 'production'),
			},
		}),
		resolve({ browser: true }),
		commonjs(),
		typescript({
			tsconfig: './tsconfig.json',
			declaration: false,
			declarationMap: false,
			outDir: 'benchmarks/dist',
		}),
	],
})
