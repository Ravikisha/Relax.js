import { DOM_TYPES } from './h'

export function areNodesEqual(oldNode: any, newNode: any) {
  if (oldNode.type !== newNode.type) {
    return false
  }

  if (oldNode.type === DOM_TYPES.HRBR) {
    return oldNode.mount === newNode.mount
  }

  if (oldNode.type === DOM_TYPES.TEXT) {
  return true
  }

  if (oldNode.type === DOM_TYPES.ELEMENT) {
  return oldNode.tag === newNode.tag && oldNode.props?.key === newNode.props?.key
  }

  if (oldNode.type === DOM_TYPES.COMPONENT) {
  return oldNode.tag === newNode.tag && oldNode.props?.key === newNode.props?.key
  }

  return true
}
