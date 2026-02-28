import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import cleanup from "rollup-plugin-cleanup";
import filesize from "rollup-plugin-filesize";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  plugins: [commonjs(), nodeResolve(), typescript({ tsconfig: './tsconfig.json' }), cleanup()],
  output: [
    {
      file: "dist/relax.js",
      format: "esm",
      plugins: [filesize()],
    },
    {
      file: "dist/relax.min.js",
      format: "esm",
      plugins: [terser(), filesize()],
    },
  ],
};

// Note: HRBR TypeScript entrypoints will be added in a follow-up once `/runtime` is implemented.

