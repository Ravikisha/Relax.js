import { createScheduler, type Lane } from './scheduler';
import { type ReconcileItem } from './reconciler';
export type FallbackRenderResult = {
    /** Direct children specs to reconcile into the host */
    children: ReconcileItem[];
    /** When true, force unkeyed reconciliation for this render */
    keyed?: boolean;
};
export type MountFallbackOptions = {
    lane?: Lane;
    scheduler?: ReturnType<typeof createScheduler>;
    /** If omitted, keyed mode is chosen automatically from keys present in `children` */
    keyed?: boolean;
};
export type MountedFallback = {
    host: Element;
    update(): void;
    destroy(): void;
    dispose(): void;
};
/**
 * Structural fallback mount for dynamic JSX structures (loops/conditionals/etc).
 *
 * Contract:
 * - `render()` may read signals.
 * - On reactivity changes, we schedule a reconcile pass in the requested lane.
 * - `render()` returns an array of child specs; each spec patches/creates a DOM node.
 */
export declare function mountFallback(host: Element, render: () => FallbackRenderResult, options?: MountFallbackOptions): MountedFallback;
//# sourceMappingURL=fallback.d.ts.map