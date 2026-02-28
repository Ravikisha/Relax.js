export function isNotBlankOrEmptyString(str: unknown) {
  return typeof str === 'string' && str.trim().length > 0
}
