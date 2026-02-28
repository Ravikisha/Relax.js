export declare const DOM_TYPES: {
    readonly TEXT: "text";
    readonly ELEMENT: "element";
    readonly FRAGMENT: "fragment";
    readonly COMPONENT: "component";
    readonly SLOT: "slot";
};
export type DomType = (typeof DOM_TYPES)[keyof typeof DOM_TYPES];
export type AnyProps = Record<string, unknown>;
export type ElementVNodeProps = {
    on?: Record<string, (payload: unknown) => void>;
    class?: string | string[];
    style?: Record<string, string>;
    key?: unknown;
} & Record<string, unknown>;
export type TextVNode = {
    type: typeof DOM_TYPES.TEXT;
    value: string;
    el?: Text;
};
export type FragmentVNode = {
    type: typeof DOM_TYPES.FRAGMENT;
    children: VNode[];
    el?: Element;
    parentFragment?: FragmentVNode;
};
export type SlotVNode = {
    type: typeof DOM_TYPES.SLOT;
    children?: VNode[];
};
export type ElementVNode = {
    type: typeof DOM_TYPES.ELEMENT;
    tag: string;
    props: ElementVNodeProps;
    children: VNode[];
    el?: HTMLElement;
    listeners?: Record<string, EventListener>;
};
export type ComponentVNode = {
    type: typeof DOM_TYPES.COMPONENT;
    tag: any;
    props: ElementVNodeProps;
    children: VNode[];
    component?: any;
    el?: Element;
};
export type VNode = TextVNode | ElementVNode | FragmentVNode | ComponentVNode | SlotVNode;
export declare function h(tag: string | unknown, props?: Record<string, unknown>, children?: unknown[]): ElementVNode | ComponentVNode;
export declare function isComponent({ tag }: {
    tag: unknown;
}): boolean;
export declare function hString(str: unknown): TextVNode;
export declare function hFragment(vNodes: unknown[]): FragmentVNode;
export declare function didCreateSlot(): boolean;
export declare function resetDidCreateSlot(): void;
export declare function hSlot(children?: VNode[]): SlotVNode;
export declare function extractChildren(vdom: {
    children?: VNode[];
}): VNode[];
//# sourceMappingURL=h.d.ts.map