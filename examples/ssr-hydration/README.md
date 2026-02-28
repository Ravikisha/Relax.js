# SSR + Hydration example (HRBR)

This example demonstrates the HRBR hydration V1 workflow:

1. **Server render**: produce HTML for a block.
2. **Client hydrate**: attach slot node references to the existing DOM.
3. **Reactive updates**: update slots without VDOM.

Notes:

- Events aren't represented in `templateHTML`, so we bind them manually in `mountClientHydrated()`.

## Run

Use any dev server that can serve TypeScript (Vite recommended).

```bash
vite --open examples/ssr-hydration/
```
