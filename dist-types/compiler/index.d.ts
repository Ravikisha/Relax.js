import type { BlockDef, CompiledSlot } from '../runtime/block';
export { hrbrJsxTransform } from './jsx';
export type { HrbrJsxTransformOptions } from './jsx';
export type CompileResult = {
    block: BlockDef;
    slots: CompiledSlot[];
    meta: CompileMeta;
};
export type CompileOrFallbackResult = ({
    kind: 'block';
} & CompileResult) | {
    kind: 'fallback';
    reason: 'dynamic-structure';
    meta: CompileMeta;
};
export type CompileOptions = {
    /** Optional filename used by the TS parser (helps with diagnostics) */
    fileName?: string;
    /**
     * When true, disallow dynamic tag names and other constructs that can't be represented as an HTML template.
     * Defaults to true.
     */
    strictTemplate?: boolean;
};
export type CompileMeta = {
    /** True when we detect patterns that require a structural reconciler (loops, conditionals, spreads, components, etc). */
    hasDynamicStructure: boolean;
    /** Per-slot lane hint (if any). */
    lanesByKey: Record<string, string>;
    /** Per-slot heuristic: looks like a signal getter call `foo()` */
    signalLikeByKey: Record<string, boolean>;
};
/**
 * Compile a single-root TSX expression like:
 *   `(<div className={cls}>Hello {name()}</div>)`
 * into a `BlockDef` + `{ key, read }[]` compatible with `mountCompiledBlock()`.
 */
export declare function compileTSXToBlock(source: string, opts?: CompileOptions): CompileResult;
/**
 * Convenience wrapper that decides whether to use HRBR block runtime or fall back to the VDOM reconciler.
 *
 * Phase 5 responsibilities:
 * - detect dynamic structure
 * - route accordingly
 */
export declare function compileTSXOrFallback(source: string, opts?: CompileOptions): CompileOrFallbackResult;
//# sourceMappingURL=index.d.ts.map