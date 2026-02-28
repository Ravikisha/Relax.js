import { type BlockDef, type MountedBlock } from './block';
export type HydratedBlock = MountedBlock;
/**
 * Hydrate a server-rendered block.
 *
 * Assumptions for V1:
 * - `host` contains exactly one root element that matches `def.templateHTML` structure.
 * - We do not mutate the DOM during hydration; we only resolve slot node references.
 * - On mismatch, we bail out and remount the block client-side.
 */
export declare function hydrateBlock(def: BlockDef, host: Element, initialValues?: Record<string, unknown>): HydratedBlock;
export declare function resolvePath(root: Node, path: number[]): Node;
//# sourceMappingURL=hydration.d.ts.map