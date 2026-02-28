/**
 * Dispatcher that registers handler functions to respond to specific
 * commands, identified by a unique name.
 *
 * The dispatcher also allows registering handler functions that run after
 * a command is handled.
 */
export declare class Dispatcher {
    #private;
    subscribe(commandName: string, handler: (payload: unknown) => void): () => void;
    afterEveryCommand(handler: () => void): () => void;
    dispatch(commandName: string, payload: unknown): void;
}
//# sourceMappingURL=dispatcher.d.ts.map