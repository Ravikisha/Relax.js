export const ARRAY_DIFF_OP = {
  ADD: 'add',
  REMOVE: 'remove',
  MOVE: 'move',
  NOOP: 'noop',
} as const

export type ArrayDiffOperation<T> =
  | { op: typeof ARRAY_DIFF_OP.ADD; index: number; item: T; originalIndex: number }
  | { op: typeof ARRAY_DIFF_OP.REMOVE; index: number; item: T; originalIndex: number }
  | { op: typeof ARRAY_DIFF_OP.MOVE; index: number; item: T; originalIndex: number }
  | { op: typeof ARRAY_DIFF_OP.NOOP; index: number; item: T; originalIndex: number }

export function withoutNulls<T>(arr: Array<T | null | undefined>): T[] {
  return arr.filter((item): item is T => item != null)
}

export function toArray<T>(x: T | T[]): T[] {
  return Array.isArray(x) ? x : [x]
}

export function arraysDiff<T>(oldArr: T[] = [], newArr: T[] = []) {
  // Multiset diff: duplicates matter.
  // Example: [1,1] -> [1] should remove one 1.
  const remainingOld = oldArr.slice()
  const added: T[] = []

  for (const newItem of newArr) {
    const idx = remainingOld.findIndex((o) => Object.is(o, newItem))
    if (idx >= 0) {
      remainingOld.splice(idx, 1)
    } else {
      added.push(newItem)
    }
  }

  const removed = remainingOld
  return { removed, added }
}

export function arraysDiffSequence<T>(
  oldArr: T[] = [],
  newArr: T[] = [],
  compareFn?: (a: T, b: T) => boolean
): Array<ArrayDiffOperation<T>> {
  const equals: (a: T, b: T) => boolean = compareFn ?? ((a, b) => Object.is(a, b))

  const sequence: Array<any> = []
  const array = new ArrayWithOriginalIndices(oldArr, equals)

  for (let index = 0; index < newArr.length; index++) {
    if (array.isRemoval(index, newArr)) {
      sequence.push(array.removeItem(index))
      // Removal shifts items left, so keep same index.
      index--
      continue
    }

    if (array.isNoop(index, newArr)) {
      sequence.push(array.noopItem(index))
      continue
    }

    const item = newArr[index] as T

    if (array.isAddition(item, index)) {
      sequence.push(array.addItem(item, index))
      continue
    }

    sequence.push(array.moveItem(item, index))
  }

  sequence.push(...array.removeItemsAfter(newArr.length))

  return sequence as Array<ArrayDiffOperation<T>>
}

export function applyArraysDiffSequence<T>(oldArr: T[], ops: Array<any>): T[] {
  return ops.reduce((array: T[], operation: any) => {
    switch (operation.op) {
      case ARRAY_DIFF_OP.ADD: {
        array.splice(operation.index, 0, operation.item)
        break
      }
      case ARRAY_DIFF_OP.REMOVE: {
        array.splice(operation.index, 1)
        break
      }
      case ARRAY_DIFF_OP.MOVE: {
        // MOVE op uses `from` on the *current* array.
  const [moved] = array.splice(operation.from, 1)
  array.splice(operation.index, 0, moved as T)
        break
      }
      case ARRAY_DIFF_OP.NOOP: {
        // nothing
        break
      }
    }

    return array
  }, [...oldArr])
}

/**
 * Wrapper around an array that keeps track of original indices as items move.
 *
 * This matches the strict contract asserted in `src/__tests__/diff-sequence.test.js`.
 */
class ArrayWithOriginalIndices<T> {
  #array: T[]
  #originalIndices: number[]
  #equalsFn: (a: T, b: T) => boolean

  constructor(array: T[], equalsFn: (a: T, b: T) => boolean) {
    this.#array = [...array]
    this.#originalIndices = array.map((_, i) => i)
    this.#equalsFn = equalsFn
  }

  get length() {
    return this.#array.length
  }

  originalIndexAt(index: number) {
    return this.#originalIndices[index]
  }

  findIndexFrom(item: T, fromIndex: number) {
    for (let i = fromIndex; i < this.length; i++) {
      if (this.#equalsFn(item, this.#array[i] as T)) {
        return i
      }
    }
    return -1
  }

  isRemoval(index: number, newArray: T[]) {
    if (index >= this.length) {
      return false
    }

    const item = this.#array[index] as T
    const indexInNewArray = newArray.findIndex((newItem) => this.#equalsFn(item, newItem as T))
    return indexInNewArray === -1
  }

  removeItem(index: number) {
    const operation = {
      op: ARRAY_DIFF_OP.REMOVE,
      index,
      item: this.#array[index] as T,
    }

    this.#array.splice(index, 1)
    this.#originalIndices.splice(index, 1)

    return operation
  }

  isNoop(index: number, newArray: T[]) {
    if (index >= this.length) {
      return false
    }

    const item = this.#array[index] as T
    const newItem = newArray[index] as T
    return this.#equalsFn(item, newItem)
  }

  noopItem(index: number) {
    return {
      op: ARRAY_DIFF_OP.NOOP,
      originalIndex: this.originalIndexAt(index),
      index,
      item: this.#array[index] as T,
    }
  }

  isAddition(item: T, fromIdx: number) {
    return this.findIndexFrom(item, fromIdx) === -1
  }

  addItem(item: T, index: number) {
    const operation = {
      op: ARRAY_DIFF_OP.ADD,
      index,
      item,
    }

    this.#array.splice(index, 0, item)
    this.#originalIndices.splice(index, 0, -1)

    return operation
  }

  moveItem(item: T, toIndex: number) {
    const fromIndex = this.findIndexFrom(item, toIndex)

    const operation = {
      op: ARRAY_DIFF_OP.MOVE,
      originalIndex: this.originalIndexAt(fromIndex),
      from: fromIndex,
      index: toIndex,
      item: this.#array[fromIndex] as T,
    }

    const [moved] = this.#array.splice(fromIndex, 1)
    this.#array.splice(toIndex, 0, moved as T)

    const [originalIndex] = this.#originalIndices.splice(fromIndex, 1)
    this.#originalIndices.splice(toIndex, 0, originalIndex as number)

    return operation
  }

  removeItemsAfter(index: number) {
    const operations: Array<any> = []
    while (this.length > index) {
      operations.push(this.removeItem(index))
    }
    return operations
  }
}
