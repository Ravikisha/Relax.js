export function objectsDiff(oldObj: Record<string, any>, newObj: Record<string, any>) {
  // Hot path: called for attributes, styles, and event maps.
  // Keep it allocation-light and linear.
  const added: string[] = []
  const removed: string[] = []
  const updated: string[] = []

  // Added/updated (iterate new keys once)
  for (const key in newObj) {
    if (!Object.prototype.hasOwnProperty.call(newObj, key)) continue

    if (!Object.prototype.hasOwnProperty.call(oldObj, key)) {
      added.push(key)
      continue
    }

    if (oldObj[key] !== newObj[key]) {
      updated.push(key)
    }
  }

  // Removed (iterate old keys once)
  for (const key in oldObj) {
    if (!Object.prototype.hasOwnProperty.call(oldObj, key)) continue
    if (!Object.prototype.hasOwnProperty.call(newObj, key)) {
      removed.push(key)
    }
  }

  return { added, removed, updated }
}

export function hasOwnProperty(obj: unknown, prop: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}
