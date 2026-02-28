export type ExtractedPropsEvents = {
    events: Record<string, (payload: unknown) => void>;
    props: Record<string, unknown>;
};
export declare function extractPropsAndEvents(vdom: {
    props: Record<string, unknown>;
}): ExtractedPropsEvents;
//# sourceMappingURL=props.d.ts.map