import { type VNode } from './h';
export type DefineComponentArgs = {
    render: (this: any) => VNode;
    state?: (props?: Record<string, any>) => Record<string, any>;
    onMounted?: (this: any) => Promise<void> | void;
    onUnmounted?: (this: any) => Promise<void> | void;
    [method: string]: any;
};
export declare function defineComponent({ render, state, onMounted, onUnmounted, ...methods }: DefineComponentArgs): any;
//# sourceMappingURL=component.d.ts.map