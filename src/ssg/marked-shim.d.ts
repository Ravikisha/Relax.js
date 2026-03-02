declare module 'marked' {
  // Keep it intentionally loose; consumers can install @types/marked if they want richer typing.
  export const marked: {
    parse: (markdown: string, options?: any) => string
  }
}
