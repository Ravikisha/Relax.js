export function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve))
}
