type TraverseCallback = (node: any, parent?: any) => boolean | void;
export declare function traverseDFS(vdom: any, cb: TraverseCallback, skipBranch?: (node: any) => boolean, parent?: any): boolean;
export declare function traverseDOM(vdom: any, cb: (v: any) => void): boolean;
export {};
//# sourceMappingURL=traverse-dom.d.ts.map