// Global JSX typings for Relax TSX.
// This is intentionally permissive for the initial migration.

declare global {
  namespace JSX {
    type Element = any
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

export {}
