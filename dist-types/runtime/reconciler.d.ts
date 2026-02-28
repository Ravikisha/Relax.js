export type Key = string | number;
export type ReconcileRange = {
    kind: 'range';
    /** Optional key for keyed reconciliation */
    key?: Key;
    /** Create the DOM nodes for this logical item (in order) */
    create(): Node[];
    /** Patch existing DOM nodes for this logical item (in order) */
    patch(nodes: Node[]): void;
    /** Optional cleanup when this logical item is removed */
    destroy?(nodes: Node[]): void;
};
export type ReconcileNode = {
    key?: Key;
    /** Create a new DOM node for this logical node */
    create(): Node;
    /** Patch an existing DOM node in-place */
    patch(node: Node): void;
    /** Optional cleanup when a node is removed */
    destroy?(node: Node): void;
};
export type ReconcileItem = ReconcileNode | ReconcileRange;
export type ReconcileOptions = {
    keyed?: boolean;
    /** When true, emit console warnings for suspicious usage patterns. */
    dev?: boolean;
};
/**
 * Patch `host.childNodes` so they match `next`.
 *
 * Contract:
 * - This reconciles *direct children* only.
 * - When keyed, keys must be unique among siblings.
 * - Nodes that remain are patched in place (no replacement) when possible.
 */
export declare function reconcileChildren(host: Node, next: ReconcileItem[], opts?: ReconcileOptions): void;
//# sourceMappingURL=reconciler.d.ts.map