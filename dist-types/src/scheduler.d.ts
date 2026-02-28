/**
 * Enqueues a job to be run on the next tick.
 * If an update wasn't already scheduled, it will be scheduled now.
 *
 * All the jobs that are added while the update is scheduled will be run on the same tick.
 */
export declare function enqueueJob(job: () => unknown): void;
/**
 * Returns a promise that resolves once all pending jobs have been processed.
 * If the jobs are asynchronous, the promise will resolve before all the jobs have completed.
 */
export declare function nextTick(): Promise<void>;
//# sourceMappingURL=scheduler.d.ts.map