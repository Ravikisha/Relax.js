export type HrbrJsxTransformOptions = {
    /** Import path to HRBR runtime helpers in generated output */
    runtimeImport?: string;
    /** Function name used as the mount wrapper that returns a MountedBlock */
    mountWrapperName?: string;
    /**
     * Dev mode: emit more readable/stable identifiers and extra metadata intended for debugging.
     *
     * Notes:
     * - This does not change runtime semantics.
     * - Sourcemap generation itself is controlled by Babel (`sourceMaps: true`).
     */
    dev?: boolean;
    /**
     * When true, attempt to derive stable slot keys from source locations.
     * Defaults to `opts.dev`.
     */
    stableSlotKeys?: boolean;
};
declare const _default: any;
export default _default;
//# sourceMappingURL=transform.d.ts.map