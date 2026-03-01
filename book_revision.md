# Relax.js Tutorial Book Revision Plan

Date: 2026-03-01

## Goals (what we’re optimizing for)

- **Tutorial-first**: readers should be able to *rebuild the core of Relax.js* step-by-step, not just read about it.
- **Single-author voice**: written in first person as the creator of Relax.js (“I built it this way because…”).
- **Senior systems + frontend perspective**: consistent emphasis on tradeoffs, invariants, performance, correctness, and good engineering discipline.
- **More general**: keep examples grounded in Relax.js, but explain the underlying UI/runtime/compiler ideas in framework-agnostic terms.
- **Code-driven teaching**: add small, focused code snippets in every chapter (with explanations of *why* that snippet exists).
- **Tests as specs**: treat test files as executable documentation; explain what a test *proves* and why it matters.
- **Keep LaTeX build green**: all edits must compile with `pdflatex` without requiring extra external tooling.

## Reader profile (who this book is for)

- Developers who can read code and reason about data structures.
- People who want to understand *how UI runtimes work*, independent of any specific framework.
- Readers who might not know Relax.js (or even VDOM/React-style rendering), but are willing to learn from first principles.

## Starting point (teach from a logical foundation)

We won't start from JS/TS syntax.
We start from a *problem statement* and a *set of constraints*:

- A UI is a function of state.
- The DOM is a mutable output device.
- We need a deterministic way to:
   - represent desired UI (a model)
   - produce DOM from that model (mount)
   - update DOM when the model changes (patch)
   - clean up when the UI is removed (destroy)

Then we implement these ideas in Relax.js.

## Non-goals

- Not turning this into a marketing brochure.
- Not copying/rewriting code wholesale into the book; snippets should be minimal and educational.
- Not requiring the reader to run heavyweight benchmark suites or complex infra.

## Working style rules for the rewrite

- Each chapter must start with:
  - **What you’ll build** (concrete output)
  - **What you’ll learn** (2–5 bullets)
  - **Prereqs** (links to earlier chapters/sections)
- Each chapter must include:
  - at least **2 code snippets** (small, runnable-looking, focused)
  - a **“Why this design?”** section (tradeoffs and alternatives)
  - a **“Tests as specs”** callout referencing 1–2 relevant tests
  - a short **“Common pitfalls”** list
- Every code snippet needs a short *commentary paragraph*:
  - what it does
  - why it exists
  - what breaks if you remove/alter it
- Maintain a consistent vocabulary:
  - DOM “commit” vs “schedule” vs “compute” vs “patch”
  - “invariant” for rules that must always hold
  - “contract” for API behavior others rely on

## Chapter template

Each chapter file in `book/chapters/` should look like this:

1) **What you'll build** (1–3 bullets)

2) **What you'll learn** (2–6 bullets)

3) **Prereqs** (links to earlier chapters/sections)

4) **Concept** (framework-agnostic explanation)

5) **Build it**

- present a minimal implementation idea
- show 2–6 code snippets
- call out invariants, edge cases, and complexity

6) **Why this design?**

- tradeoffs
- alternative approaches
- why I chose this one in Relax

7) **Tests as specs**

- reference 1–3 concrete test files
- explain what those tests prove

8) **Pitfalls**

- 4–8 bullets of common mistakes

9) **Mini-exercise**

- small change to code + expected behavior
- optionally: write/extend a test (without requiring the reader to run huge suites)

## Proposed new book structure (tutorial path)

This plan turns the existing chapter sequence into a build-along path. We’ll keep most existing chapters, but reshape the narrative so a reader can reconstruct Relax.js in layers.

### Part 0 — Orientation

1. **What we’re building and why**
   - Goal: the mental model of a UI runtime and where Relax.js fits.
   - Add: tiny end-to-end example: `h()` → `mountDOM()` → click handler → re-render.

2. **Repo tour + how to read this codebase**
   - Explain folder layout and “how code flows” in Relax.
   - Add: “trace a click event” walkthrough from `onClick` prop to dispatcher.

### Part 1 — A minimal VDOM runtime (baseline)

3. **VDOM data model: VNodes, props, children**
   - Build: `h(type, props, ...children)` and normalization.
   - Teach: data shapes, invariants, and why normalization reduces complexity.
   - Snippet targets: `src/h.js`, `extractChildren`.

4. **Mounting: VNode → actual DOM**
   - Build: `mountDOM` for elements, text nodes, fragments.
   - Teach: why DOM creation is expensive and what we can cache.
   - Tests as specs: mounting fragments, preserving parent refs.

5. **Updating: patching and diffing**
   - Build: `patchDOM`, keyed children updates, attribute updates.
   - Teach: structural equality vs referential equality, reorder vs replace.
   - Tests as specs: keyed reordering and LIS-based behavior.

6. **Destroy/unmount**
   - Build: `destroyDOM` and safe teardown.
   - Teach: memory leaks, listeners, and component lifecycle invariants.

### Part 2 — Components and scheduling (correctness under change)

7. **Component model**
   - Build: component node mounting and lifecycle.
   - Teach: why components are “state machines” with strict lifecycle edges.

8. **Scheduling and microtask boundaries**
   - Build: `nextTick` and the scheduler concept.
   - Teach: batching, starvation, fairness, and how scheduling affects perceived performance.

### Part 3 — HRBR (the “why we built Relax” layer)

9. **Signals and reactive graph basics**
   - Build: `createSignal`, `createEffect` mental model (even if impl differs).
   - Teach: dependency tracking, invalidation, deterministic ordering.

10. **HRBR blocks: template + slots**
   - Teach: “precompiled DOM addressing” and why it beats VDOM diffing in stable structures.
   - Build-along: minimal block definition + mounting + updating via slots.

11. **Deterministic scheduler + budget model**
   - Teach: predictable ordering, work budgets, avoiding long tasks.

12. **Fallback reconciler + interop with VDOM**
   - Teach: how to stay correct when compilation can’t guarantee static structure.

### Part 4 — Compiler toolchain (how we generate HRBR)

13. **Compiler architecture overview**
   - Teach: from TSX AST → template HTML → slot map.

14. **Babel plugin deep dive**
   - Teach: safe transforms, identifiers, imports, dev/prod toggles.

### Part 5 — Production discipline (how to trust it)

15. **Benchmarks methodology**
   - Already improved; we’ll reframe it as: “how I measure performance without lying to myself.”

16. **Release/quality discipline**
   - Teach: test strategy, perf smoke, CI gates, and “what I refuse to regress.”

## Chapter-by-chapter rewrite checklist (what changes we’ll actually make)

For each existing chapter file in `book/chapters/`:

- [ ] Add “What you’ll build / learn / prereqs” section at top.
- [ ] Add 2–6 short snippets (max ~25–40 lines each).
- [ ] Add “Why this design?” with alternatives.
- [ ] Add “Tests as specs” referencing exact test filenames.
- [ ] Add “Pitfalls” bullets.
- [ ] Ensure terminology matches book glossary.

## Voice & tone guide (single-author, senior engineering)

Write as if:

- I’m the original author explaining decisions I made.
- I’m friendly but direct.
- I emphasize *invariants* and *tradeoffs*.
- I call out hidden complexity: scheduling, async boundaries, DOM costs, GC.

Example patterns to use:

- “I optimized for **X** because it’s the thing that bites you at scale.”
- “This invariant looks pedantic, but it prevents an entire class of bugs.”
- “Here’s the naive implementation first—then I’ll show where it fails.”
- “The test suite proves this behavior; you don’t have to trust my words.”

## Code snippet standards

- Prefer snippets that map directly to real files.
- Keep them small and focused. If needed, show a simplified version and then point to the real implementation.
- When showing Relax.js internals, annotate with:
  - “Invariant:”
  - “Cost model:”
  - “Edge case:”

## New cross-cutting additions

### 1) A small glossary

Add a glossary section (either appendix or early chapter) for:

- VNode, mount, patch, diff, commit
- keyed children, LIS
- signals, effects, invalidation
- HRBR block, template, slot
- deterministic scheduling, budget

### 2) A recurring “build-along” project

Add a minimal app that grows with the book:

- starts as static render
- adds events
- adds list updates
- adds component state
- later: shows HRBR compilation benefits

Place source as teaching artifacts under something like `docs/tutorial/` (optional; only if it doesn’t add maintenance burden).

### 2.1) Build-along milestones (explicit outputs)

These milestones keep the tutorial concrete:

- **Milestone A**: create VNodes with `h()` and mount basic DOM
- **Milestone B**: patch text/attributes/props without replacing nodes
- **Milestone C**: handle events with stable semantics
- **Milestone D**: build components + lifecycle
- **Milestone E**: add `nextTick()` scheduling and explain why
- **Milestone F**: introduce HRBR blocks and show targeted updates
- **Milestone G**: explain compiler output shape (template + slots)
- **Milestone H**: show quality gates (tests + perf smoke + benchmarks reading)

### 3) “Knowledge checks” that are actually useful

After each chapter:

- 3–5 questions that force reasoning (“What happens if…?”)
- 1 mini-exercise that touches real code (small change + expected behavior)

## Execution plan (how we’ll do the rewrite safely)

### Phase 1 — Book scaffolding (fast, low risk)

- Add per-chapter intros/outros, terminology cleanup, and consistent author voice.
- No large structural refactors yet.
- Compile after every chapter or two.

### Phase 2 — Add code-driven tutorials

- Insert snippets + “why” sections.
- Add test references and explain them as specs.
- Keep snippets short and aligned with repo code.

### Phase 3 — Make it more general

- Add neutral “concept” callouts: how other frameworks solve the same problem.
- Add resource links (MDN, React docs for keys, Brendan Gregg for latency, etc.).

### Phase 4 — Polish + consistency

- Global glossary.
- Index/TOC hygiene.
- Reduce repetition and unify diagrams.

## Success criteria

- A reader can follow the book and explain:
  - how Relax mounts and patches DOM
  - why scheduling matters for correctness and responsiveness
  - why HRBR exists and when it wins
  - how the compiler produces slots/templates
  - how tests and benchmarks prevent regressions

- Each chapter stands alone as a lesson but also fits the build-along journey.

## Next concrete edits (recommended starting point)

1. Update `book/chapters/ch01-what-and-why.tex`:
   - add build-along mini example
   - add “what you’ll build/learn”

2. Update `book/chapters/ch02-repo-tour.tex`:
   - add a guided trace (event → dispatcher → handler)

3. Update `book/chapters/ch03-tsx-jsx.tex`:
   - keep it conceptual, but add minimal practical snippets.

## Detailed scope for the first revision pass (what I will change first)

### Pass 1 (Ch 1–2): set the teaching tone

- Rewrite Chapter 1 to open from first principles:
   - “UI is state → DOM is output; we need a model and an updater.”
   - show a tiny end-to-end cycle
   - define a small glossary-in-context (VNode, mount, patch, commit)
- Rewrite Chapter 2 to teach how to read the repo as a system:
   - “follow one user interaction” trace
   - tests-as-spec workflow

### Pass 2 (Ch 3–8): VDOM core tutorial

- TSX/JSX: positioned as authoring convenience, not required for core understanding.
- VNode model, mount, patch, diff, destroy: build-along narrative.

### Pass 3 (Ch 9–11): lifecycle and scheduling

- Components as state machines.
- `nextTick()` as a correctness tool (not just performance).

### Pass 4 (Ch 12–18): HRBR runtime and interop

- Signals and deterministic scheduling.
- Blocks/templates/slots.
- Fallback reconciler for dynamic structure.

### Pass 5 (Ch 19–23): compiler and production discipline

- compiler architecture and plugin behavior.
- instrumentation, benchmarks, release discipline.
