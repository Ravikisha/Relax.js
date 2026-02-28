export function objectsDiff(oldObj: Record<string, any>, newObj: Record<string, any>) {
  const oldKeys = Object.keys(oldObj)
  const newKeys = Object.keys(newObj)

  return {
    added: newKeys.filter((key) => !(key in oldObj)),
    removed: oldKeys.filter((key) => !(key in newObj)),
    updated: newKeys.filter((key) => key in oldObj && oldObj[key] !== newObj[key]),
  }
}

export function hasOwnProperty(obj: unknown, prop: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}
