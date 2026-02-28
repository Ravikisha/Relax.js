export declare function addEventListener(eventName: string, handler: (payload: unknown) => void, el: Element, hostComponent?: any): (event: Event) => void;
export declare function addEventListeners(events: Record<string, (payload: unknown) => void>, el: Element, hostComponent?: any): Record<string, EventListener>;
export declare function removeEventListeners(listeners: Record<string, EventListener>, el: Element): void;
//# sourceMappingURL=events.d.ts.map