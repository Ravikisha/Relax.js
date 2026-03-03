// Compile-time dev flag.
// Rollup injects a literal boolean for `RELAX_DEV` so dead-code elimination can drop dev-only branches.
// IMPORTANT: don't compute this from `process.env` at runtime for browser builds.
//
// eslint-disable-next-line no-undef
declare const RELAX_DEV: boolean

// Default to true when not replaced (tests / dev tooling), but allow Rollup to
// inject a literal for tree-shaking in production bundles.
export const DEV: boolean = typeof RELAX_DEV === 'boolean' ? RELAX_DEV : true
