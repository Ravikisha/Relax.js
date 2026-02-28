# HRBR scheduler

> Date: 2026-02-28
>
> Status: Draft (v1)

HRBR uses a deterministic scheduler with lanes and time budgets.

---

## Lanes

A lane is a coarse priority bucket:

- `sync`
- `input`
- `default`
- `transition`
- `idle`

Lower is higher priority (`sync` runs before `input`, etc.).

---

## Budgets

Two related concepts exist:

1) **Per-task budget** (`budgetMs`)
   - Provided when scheduling a task.
   - Used as a hint for how expensive a task is allowed to be.

2) **Frame budget cap** (`setFrameBudget(ms)`)
   - A global cap used by the scheduler’s own flush loop.
   - Even if individual tasks have larger budgets, the scheduler time-slices work when the cap is reached.

At runtime, the HRBR entry (`runtime/index.ts`) exposes:

- `withBudget(budgetMs, fn)`
- `setFrameBudget(ms)`

---

## Determinism rules

Within a lane, queue ordering is deterministic.

Tie-breaker order (conceptually):

1) lane priority
2) explicit deadline (if provided)
3) timestamp
4) created id

Additionally:

- promotion/aging occurs deterministically based on queue-head age/deadline.

---

## Flush strategies

In browsers, you can pick a strategy:

- timeout (universal fallback)
- `MessageChannel`
- `requestAnimationFrame`

See `runtime/scheduler.ts`:

- `createRequestFlush(strategy)`
- `createBrowserScheduler({ strategy })`

---

## Testing expectations

The test suite asserts:

- lane priority order
- budget slicing across multiple flushes
- deterministic ordering by deadline and id
- starvation prevention via deterministic promotion

