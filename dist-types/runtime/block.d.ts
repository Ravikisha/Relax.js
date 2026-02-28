import { createScheduler, type Lane } from './scheduler';
export type BlockSlotKind = 'text' | 'attr' | 'prop' | 'class' | 'style' | 'event';
export type TextSlot = {
    kind: 'text';
    /** Path from the template root to a Text node */
    path: number[];
};
export type AttrSlot = {
    kind: 'attr';
    /** Path from the template root to an Element */
    path: number[];
    name: string;
};
export type PropSlot = {
    kind: 'prop';
    /** Path from the template root to an Element */
    path: number[];
    name: string;
};
export type ClassSlot = {
    kind: 'class';
    /** Path from the template root to an Element */
    path: number[];
};
export type StyleSlot = {
    kind: 'style';
    /** Path from the template root to an Element */
    path: number[];
};
export type EventSlot = {
    kind: 'event';
    /** Path from the template root to an Element */
    path: number[];
    /** DOM event name, e.g. 'click' */
    name: string;
};
export type BlockSlot = TextSlot | AttrSlot | PropSlot | ClassSlot | StyleSlot | EventSlot;
export type BlockDef = {
    templateHTML: string;
    slots: Record<string, BlockSlot>;
};
export type CompiledSlot = {
    key: string;
    read: () => unknown;
};
export type MountCompiledBlockOptions = {
    lane?: Lane;
    scheduler?: ReturnType<typeof createScheduler>;
};
export type MountedBlock = {
    host: Element;
    root: Element;
    slotNodes: Record<string, Node>;
    update(values: Record<string, unknown>): void;
    /** Dispose reactive resources (if any) and remove DOM. Safe to call multiple times. */
    dispose(): void;
    destroy(): void;
};
export declare function defineBlock(def: BlockDef): BlockDef;
export declare function mountBlock(def: BlockDef, host: Element, initialValues?: Record<string, unknown>): MountedBlock;
/**
 * Mount a block and wire reactive slot computations via signals.
 *
 * Contract:
 * - `slots` is a list of `{ key, read }` where `read()` may access signals.
 * - When the reactive graph triggers, we schedule `block.update({[key]: read()})` in the requested lane.
 */
export declare function mountCompiledBlock(def: BlockDef, host: Element, slots: CompiledSlot[], options?: MountCompiledBlockOptions): MountedBlock & {
    dispose(): void;
};
export declare function resolvePath(root: Node, path: number[]): Node;
//# sourceMappingURL=block.d.ts.map