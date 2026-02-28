export type Lane = 'sync' | 'input' | 'default' | 'transition' | 'idle';
export type ScheduledTask<T = void> = {
    id: number;
    lane: Lane;
    priority: number;
    timestamp: number;
    deadline: number;
    budgetMs: number;
    run: () => T;
};
export type ScheduleOptions = {
    /** If provided, overrides the computed deadline. Absolute timestamp in `now()` units. */
    deadline?: number;
    /** Optional per-task budget. Defaults to scheduler defaultBudgetMs. */
    budgetMs?: number;
};
export type SchedulerOptions = {
    now?: () => number;
    requestFlush?: (cb: () => void) => void;
    defaultBudgetMs?: number;
};
export type FlushStrategy = 'timeout' | 'messageChannel' | 'raf';
export declare function createRequestFlush(strategy?: FlushStrategy): (cb: () => void) => void;
export declare function createBrowserScheduler(options?: Omit<SchedulerOptions, 'requestFlush'> & {
    strategy?: FlushStrategy;
}): {
    schedule: <T>(lane: Lane, run: () => T, budgetOrOptions?: number | ScheduleOptions) => ScheduledTask<T>;
    flush: ({ budgetMs }: {
        budgetMs: number;
    }) => void;
    hasPending: () => boolean;
    withBudget: <T>(budgetMs: number, fn: () => T) => T;
    setFrameBudget: (ms: number) => void;
    setDefaultBudget: (ms: number) => void;
    _queues: Record<Lane, ScheduledTask<any>[]>;
    _now: () => number;
};
export declare function createScheduler(options?: SchedulerOptions): {
    schedule: <T>(lane: Lane, run: () => T, budgetOrOptions?: number | ScheduleOptions) => ScheduledTask<T>;
    flush: ({ budgetMs }: {
        budgetMs: number;
    }) => void;
    hasPending: () => boolean;
    withBudget: <T>(budgetMs: number, fn: () => T) => T;
    setFrameBudget: (ms: number) => void;
    setDefaultBudget: (ms: number) => void;
    _queues: Record<Lane, ScheduledTask<any>[]>;
    _now: () => number;
};
//# sourceMappingURL=scheduler.d.ts.map