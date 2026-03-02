export type DevtoolsEvent = {
    type: 'slotWrite';
    slotKind: string;
    slotKey: string;
} | {
    type: 'scheduleComputation';
    name?: string;
    lane?: string;
} | {
    type: 'flushStart';
} | {
    type: 'flushEnd';
    durationMs: number;
} | {
    type: 'domOp';
    op: string;
} | {
    type: 'alloc';
    kind: string;
    count?: number;
};
export type DevtoolsCounters = {
    slotWrites: number;
    scheduledComputations: number;
    flushes: number;
    flushTimeMs: number;
    domOps: number;
    allocs: number;
};
export type DevtoolsHook = (event: DevtoolsEvent) => void;
export declare function setInstrumentationEnabled(enabled: boolean): void;
export declare function isInstrumentationEnabled(): boolean;
export declare function setDevtoolsHook(hook: DevtoolsHook | null): void;
export declare function getDevtoolsCounters(): DevtoolsCounters;
export declare function resetDevtoolsCounters(): void;
export declare function emitDevtoolsEvent(event: DevtoolsEvent): void;
export declare function emitDomOp(op: string): void;
export declare function emitAlloc(kind: string, count?: number): void;
//# sourceMappingURL=devtools.d.ts.map