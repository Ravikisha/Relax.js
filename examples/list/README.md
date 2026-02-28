# List example: 10k rows / 1% updates

This example compares two rendering modes for a large list:

- **HRBR fallback**: `runtime/signals` + `runtime/mountFallback()` + `runtime/reconcileChildren()`
- **VDOM baseline**: classic Relax.js component + VDOM patching from `src/`

## Run

This repo doesn't ship a dev server. Use any static file server that can serve TypeScript via bundling (recommended), or open this folder in your preferred toolchain.

If you already have Vite installed globally, you can run it from the repo root:

```bash
vite --open examples/list/
```

(Any equivalent dev server is fine.)

## What to look for

- Click **Mount**, then repeatedly click **Update 1%**.
- In HRBR mode, the underlying `<li>` nodes are moved/patched instead of being recreated.
