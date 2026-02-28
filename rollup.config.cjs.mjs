import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import cleanup from "rollup-plugin-cleanup";
import filesize from "rollup-plugin-filesize";
import typescript from "@rollup/plugin-typescript";

export default {
  input: {
    index: "src/index.ts",
    hrbr: "runtime/index.ts",
    compiler: "compiler/index.ts",
  },
  plugins: [commonjs(), nodeResolve(), typescript({ tsconfig: "./tsconfig.rollup.cjs.json" }), cleanup()],
  output: {
    dir: "dist/cjs",
    format: "cjs",
    exports: "named",
    entryFileNames: "[name].cjs",
    sourcemap: true,
    plugins: [filesize()],
  },
};
