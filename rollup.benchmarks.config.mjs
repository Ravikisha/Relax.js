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
				'process.env.NODE_ENV': JSON.stringify('production'),
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
