export type Lane = 'sync' | 'input' | 'default' | 'transition' | 'idle'

export type ScheduledTask<T = void> = {
  id: number
  lane: Lane
  priority: number
  timestamp: number
  deadline: number
  budgetMs: number
  run: () => T
}

export type ScheduleOptions = {
  /** If provided, overrides the computed deadline. Absolute timestamp in `now()` units. */
  deadline?: number
  /** Optional per-task budget. Defaults to scheduler defaultBudgetMs. */
  budgetMs?: number
}

export type SchedulerOptions = {
  now?: () => number
  // Called when we want work to continue later.
  requestFlush?: (cb: () => void) => void
  defaultBudgetMs?: number
}

export type FlushStrategy = 'timeout' | 'messageChannel' | 'raf'

import { emitDevtoolsEvent } from './devtools'

export function createRequestFlush(strategy: FlushStrategy = 'timeout'): (cb: () => void) => void {
  if (strategy === 'messageChannel') {
    // MessageChannel is available in most browsers and in newer Node runtimes.
    // We still guard to keep a universal fallback.
    const MC: any = (globalThis as any).MessageChannel
    if (typeof MC === 'function') {
      const channel = new MC()
      let pending: (() => void) | null = null
      channel.port1.onmessage = () => {
        const cb = pending
        pending = null
        cb?.()
      }
      return (cb) => {
        pending = cb
        channel.port2.postMessage(0)
      }
    }
  }

  if (strategy === 'raf') {
    const raf = (globalThis as any).requestAnimationFrame
    if (typeof raf === 'function') {
      return (cb) => raf(() => cb())
    }
  }

  // Universal fallback.
  return (cb) => setTimeout(cb, 0)
}

export function createBrowserScheduler(options: Omit<SchedulerOptions, 'requestFlush'> & { strategy?: FlushStrategy } = {}) {
  const { strategy = 'timeout', ...rest } = options
  return createScheduler({ ...rest, requestFlush: createRequestFlush(strategy) })
}

const LANE_PRIORITY: Record<Lane, number> = {
  sync: 0,
  input: 1,
  default: 2,
  transition: 3,
  idle: 4,
}

export function createScheduler(options: SchedulerOptions = {}) {
  const now = options.now ?? (() => performance.now())
  let defaultBudgetMs = options.defaultBudgetMs ?? 5
  // Global cap applied to flushes scheduled by the scheduler itself.
  // Tasks may have larger budgetMs, but they will still be time-sliced by this cap.
  let frameBudgetMs: number = defaultBudgetMs
  const requestFlush = options.requestFlush ?? createRequestFlush('timeout')

  let nextTaskId = 0
  let isFlushScheduled = false

  const queues: Record<Lane, ScheduledTask<any>[]> = {
    sync: [],
    input: [],
    default: [],
    transition: [],
    idle: [],
  }

  // Aging/promotion: if wait exceeds threshold, promote one lane.
  // Determinism rule: promotion is based on queue head age only and happens
  // before selecting the next task.
  const AGING_MS = 250

  function sortQueueInLane(q: ScheduledTask<any>[]) {
    // Deterministic tie-breakers within a lane:
  //   1) earlier deadline
  //   2) earlier timestamp
  //   3) lower created id
    // (lanePriority is handled by lane selection order)
    if (q.length <= 1) return
  q.sort((a, b) => (a.deadline - b.deadline) || (a.timestamp - b.timestamp) || (a.id - b.id))
  }

  function promoteLane(lane: Lane): Lane {
    // Promote toward higher priority in single steps.
    switch (lane) {
      case 'idle':
        return 'transition'
      case 'transition':
        return 'default'
      case 'default':
        return 'input'
      default:
        return lane
    }
  }

  function schedule<T>(
    lane: Lane,
    run: () => T,
    budgetOrOptions: number | ScheduleOptions = defaultBudgetMs,
  ): ScheduledTask<T> {
    const ts = now()

    const { budgetMs, deadline } =
      typeof budgetOrOptions === 'number'
        ? { budgetMs: budgetOrOptions, deadline: undefined }
        : {
            budgetMs: budgetOrOptions.budgetMs ?? defaultBudgetMs,
            deadline: budgetOrOptions.deadline,
          }

    const task: ScheduledTask<T> = {
      id: nextTaskId++,
      lane,
      priority: LANE_PRIORITY[lane],
      timestamp: ts,
      deadline: typeof deadline === 'number' ? deadline : ts + budgetMs,
      budgetMs,
      run,
    }

  const q = queues[lane]
  q.push(task)
  sortQueueInLane(q)

    // sync lane runs immediately
    if (lane === 'sync') {
      flush({ budgetMs: Infinity })
      return task
    }

    ensureFlushScheduled()
    return task
  }

  function ensureFlushScheduled() {
    if (isFlushScheduled) return
    isFlushScheduled = true
    requestFlush(() => {
      isFlushScheduled = false
  flush({ budgetMs: frameBudgetMs })
    })
  }

  function pickNextTask(): ScheduledTask<any> | null {
    // Promote starving tasks
    const t = now()
    for (const lane of ['idle', 'transition', 'default'] as const) {
      const q = queues[lane]
      if (q.length === 0) continue
      const head = q[0]
      if (!head) continue
  const overdue = t >= head.deadline
  const aged = t - head.timestamp > AGING_MS
  if (overdue || aged) {
        // promote one task (deterministically: the oldest head)
        const task = q.shift()!
        const promotedLane = promoteLane(lane)
        task.lane = promotedLane
        task.priority = LANE_PRIORITY[promotedLane]
        const dst = queues[promotedLane]
        dst.push(task)
        sortQueueInLane(dst)
      }
    }

    for (const lane of ['sync', 'input', 'default', 'transition', 'idle'] as const) {
      const q = queues[lane]
      if (q.length > 0) return q.shift()!
    }

    return null
  }

  function flush({ budgetMs }: { budgetMs: number }) {
  const start = now()
  emitDevtoolsEvent({ type: 'flushStart' })

    while (true) {
      const task = pickNextTask()
      if (!task) break

      task.run()

      const elapsed = now() - start
      if (elapsed >= budgetMs) {
        // continue next frame/tick
        if (hasPending()) ensureFlushScheduled()
        break
      }
    }

  emitDevtoolsEvent({ type: 'flushEnd', durationMs: now() - start })
  }

  function hasPending() {
    return (
      queues.sync.length +
        queues.input.length +
        queues.default.length +
        queues.transition.length +
        queues.idle.length >
      0
    )
  }

  function withBudget<T>(budgetMs: number, fn: () => T): T {
    const start = now()
    const out = fn()
    // If budget exceeded and tasks remain, schedule another flush.
    if (now() - start >= budgetMs && hasPending()) ensureFlushScheduled()
    return out
  }

  function setFrameBudget(ms: number) {
    // Clamp to a small positive value to avoid accidental infinite loops.
    frameBudgetMs = Number.isFinite(ms) ? Math.max(0, ms) : defaultBudgetMs
  }

  function setDefaultBudget(ms: number) {
    defaultBudgetMs = ms
    // Keep frame budget aligned unless user has explicitly changed it later.
    frameBudgetMs = ms
  }

  return {
    schedule,
    flush,
    hasPending,
    withBudget,
    setFrameBudget,
    setDefaultBudget,
    _queues: queues,
    _now: now,
  }
}
