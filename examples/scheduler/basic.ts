import { createScheduler } from '../../runtime/scheduler'

// Tiny example showing lane priorities and cooperative budgeting.
const scheduler = createScheduler({ defaultBudgetMs: 4 })

scheduler.schedule('idle', () => console.log('idle work'))
scheduler.schedule('transition', () => console.log('transition work'))
scheduler.schedule('default', () => console.log('default work'))
scheduler.schedule('input', () => console.log('input work'))

// sync lane runs immediately
scheduler.schedule('sync', () => console.log('sync work (immediate)'))

// Example of splitting a long task.
let chunk = 0
scheduler.schedule('default', () => {
  const start = performance.now()
  while (performance.now() - start < 10) {
    // busy work
  }
  console.log('ran long chunk', ++chunk)
})
