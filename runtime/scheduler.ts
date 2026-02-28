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

export type SchedulerOptions = {
  now?: () => number
  // Called when we want work to continue later.
  requestFlush?: (cb: () => void) => void
  defaultBudgetMs?: number
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
  const defaultBudgetMs = options.defaultBudgetMs ?? 5
  const requestFlush =
    options.requestFlush ??
    ((cb) => {
      // setTimeout(0) works in both jsdom and browsers.
      setTimeout(cb, 0)
    })

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
  const AGING_MS = 250

  function schedule<T>(lane: Lane, run: () => T, budgetMs: number = defaultBudgetMs): ScheduledTask<T> {
    const ts = now()
    const task: ScheduledTask<T> = {
      id: nextTaskId++,
      lane,
      priority: LANE_PRIORITY[lane],
      timestamp: ts,
      deadline: ts + budgetMs,
      budgetMs,
      run,
    }

    queues[lane].push(task)

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
      flush({ budgetMs: defaultBudgetMs })
    })
  }

  function pickNextTask(): ScheduledTask<any> | null {
    // Promote starving tasks
    const t = now()
    for (const lane of ['idle', 'transition', 'default'] as const) {
      const q = queues[lane]
      if (q.length === 0) continue
  const head = q[0]
  if (head && t - head.timestamp > AGING_MS) {
        // promote one lane up
        const task = q.shift()!
        const promotedLane: Lane = lane === 'idle' ? 'transition' : 'input'
        task.lane = promotedLane
        task.priority = LANE_PRIORITY[promotedLane]
        queues[promotedLane].push(task)
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

  return {
    schedule,
    flush,
    hasPending,
    withBudget,
    _queues: queues,
    _now: now,
  }
}
