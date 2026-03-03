import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import cleanup from "rollup-plugin-cleanup";
import filesize from "rollup-plugin-filesize";
import typescript from "@rollup/plugin-typescript";
import replace from '@rollup/plugin-replace'

export default {
  input: {
    index: "src/index.ts",
    hrbr: "runtime/index.ts",
    compiler: "compiler/index.ts",
  },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        // eslint-disable-next-line no-process-env
        RELAX_DEV: JSON.stringify(process.env.NODE_ENV !== 'production'),
      },
    }),
    commonjs(),
    nodeResolve(),
    typescript({ tsconfig: "./tsconfig.rollup.cjs.json" }),
    cleanup(),
  ],
  output: {
    dir: "dist/cjs",
    format: "cjs",
    exports: "named",
    entryFileNames: "[name].cjs",
    sourcemap: true,
    plugins: [filesize()],
  },
};
