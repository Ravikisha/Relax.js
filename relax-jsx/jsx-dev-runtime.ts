// Dev JSX runtime for tooling that emits jsxDEV.
// Vitest/Vite will try to import this in dev mode.

import { Fragment, jsx, jsxs } from './jsx-runtime'

export { Fragment, jsx, jsxs }

export function jsxDEV(type: any, props: any, key?: any) {
  return jsx(type, props, key)
}
