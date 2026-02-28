let isScheduled = false
const jobs: Array<() => unknown> = []

/**
 * Enqueues a job to be run on the next tick.
 * If an update wasn't already scheduled, it will be scheduled now.
 *
 * All the jobs that are added while the update is scheduled will be run on the same tick.
 */
export function enqueueJob(job: () => unknown) {
  jobs.push(job)
  scheduleUpdate()
}

function scheduleUpdate() {
  if (isScheduled) return

  isScheduled = true
  queueMicrotask(processJobs)
}

function processJobs() {
  while (jobs.length > 0) {
    const job = jobs.shift()!
    const result = job()

    Promise.resolve(result).then(
      () => {
        // Job completed successfully
      },
      (error) => {
        console.error(`[scheduler]: ${error}`)
      }
    )
  }

  isScheduled = false
}

/**
 * Returns a promise that resolves once all pending jobs have been processed.
 * If the jobs are asynchronous, the promise will resolve before all the jobs have completed.
 */
export function nextTick() {
  scheduleUpdate()
  return flushPromises()
}

function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve))
}
