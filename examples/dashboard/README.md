# Dashboard example: 200 widgets

This example compares a dashboard of 200 widgets in two modes:

- **HRBR blocks**: each widget is a compiled `BlockDef` mounted with `mountCompiledBlock()`.
- **VDOM baseline**: widgets are rendered as a keyed list in the classic Relax VDOM.

Each tick updates ~1% of widgets.

## Run

Use any TS-capable dev server (Vite recommended):

```bash
vite --open examples/dashboard/
```
