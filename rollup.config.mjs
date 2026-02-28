import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import cleanup from 'rollup-plugin-cleanup';
import filesize from 'rollup-plugin-filesize';
import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
export default {
  input: {
    index: 'src/index.ts',
    hrbr: 'runtime/index.ts',
    compiler: 'compiler/index.ts',
  },
  plugins: [commonjs(), nodeResolve(), typescript({ tsconfig: './tsconfig.rollup.json' }), cleanup()],
  output: {
    dir: 'dist/esm',
    format: 'esm',
    entryFileNames: '[name].js',
    sourcemap: true,
    plugins: [filesize()],
  },
};

// Note: If we want single-file minified bundles, we can add a separate Rollup config
// (one input per config) since named multi-input builds require `output.dir`.

