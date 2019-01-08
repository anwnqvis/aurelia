import { IContainer, IRegistry } from '@aurelia/kernel';
import { IDOM, INode } from './dom';
import { ICustomElement } from './resources/custom-element';
export interface ISinglePageApp<THost extends INode = INode> {
    dom?: IDOM;
    host: THost;
    component: unknown;
}
export declare class Aurelia {
    private container;
    private components;
    private startTasks;
    private stopTasks;
    private isStarted;
    private _root;
    constructor(container?: IContainer);
    register(...params: (IRegistry | Record<string, Partial<IRegistry>>)[]): this;
    app(config: ISinglePageApp): this;
    root(): ICustomElement | null;
    start(): this;
    stop(): this;
}
export declare const IDOMInitializer: import("@aurelia/kernel").InterfaceSymbol<IDOMInitializer>;
export interface IDOMInitializer {
    initialize(config?: ISinglePageApp): IDOM;
}
//# sourceMappingURL=aurelia.d.ts.map