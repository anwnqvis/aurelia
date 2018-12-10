import { Reporter } from '@aurelia/kernel';
import { INodeSequence, IRenderLocation } from '../dom';
import { IAttach, IBindScope, ILifecycle, ILifecycleUnbind, IMountable, IRenderContext, IView, IViewCache, IViewFactory, State } from '../lifecycle';
import { IScope, LifecycleFlags } from '../observation';
import { $attachView, $cacheView, $detachView, $mountView, $unmountView } from './lifecycle-attach';
import { $bindView, $unbindView } from './lifecycle-bind';
import { ITemplate } from './lifecycle-render';
import { INsNodeSequence, INsRenderLocation } from '../ns-dom';

/*@internal*/
export interface View extends IView {}

/*@internal*/
export class View implements IView {
  public $bindableHead: IBindScope;
  public $bindableTail: IBindScope;

  public $nextBind: IBindScope;
  public $prevBind: IBindScope;

  public $attachableHead: IAttach;
  public $attachableTail: IAttach;

  public $nextAttach: IAttach;
  public $prevAttach: IAttach;

  public $nextMount: IMountable;
  public $nextUnmount: IMountable;

  public $nextUnbindAfterDetach: ILifecycleUnbind;

  public $state: State;
  public $scope: IScope;
  public $nodes: INsNodeSequence;
  public $context: IRenderContext;
  public location: INsRenderLocation;
  public cache: IViewCache;
  public isFree: boolean;

  public readonly $lifecycle: ILifecycle;

  constructor($lifecycle: ILifecycle, cache: IViewCache) {
    this.$bindableHead = null;
    this.$bindableTail = null;

    this.$nextBind = null;
    this.$prevBind = null;

    this.$attachableHead = null;
    this.$attachableTail = null;

    this.$nextAttach = null;
    this.$prevAttach = null;

    this.$nextMount = null;
    this.$nextUnmount = null;

    this.$nextUnbindAfterDetach = null;

    this.$state = State.none;
    this.$scope = null;
    this.isFree = false;

    this.$lifecycle = $lifecycle;
    this.cache = cache;
  }

  public hold(location: INsRenderLocation, flags: LifecycleFlags): void {
    if (!location.parentNode) { // unmet invariant: location must be a child of some other node
      throw Reporter.error(60); // TODO: organize error codes
    }
    this.location = location;
  }

  public lockScope(scope: IScope): void {
    this.$scope = scope;
    this.$bind = lockedBind;
  }

  public release(flags: LifecycleFlags): boolean {
    this.isFree = true;
    if (this.$state & State.isAttached) {
      return this.cache.canReturnToCache(this);
    }

    return !!this.$unmount(flags);
  }
}

/*@internal*/
export class ViewFactory implements IViewFactory {
  public static maxCacheSize: number = 0xFFFF;

  public isCaching: boolean;
  public name: string;

  private cache: View[];
  private cacheSize: number;
  private lifecycle: ILifecycle;
  private template: ITemplate;

  constructor(name: string, template: ITemplate, lifecycle: ILifecycle) {
    this.isCaching = false;

    this.cacheSize = -1;
    this.cache = null;
    this.lifecycle = lifecycle;
    this.name = name;
    this.template = template;
  }

  public setCacheSize(size: number | '*', doNotOverrideIfAlreadySet: boolean): void {
    if (size) {
      if (size === '*') {
        size = ViewFactory.maxCacheSize;
      } else if (typeof size === 'string') {
        size = parseInt(size, 10);
      }

      if (this.cacheSize === -1 || !doNotOverrideIfAlreadySet) {
        this.cacheSize = size;
      }
    }

    if (this.cacheSize > 0) {
      this.cache = [];
    } else {
      this.cache = null;
    }

    this.isCaching = this.cacheSize > 0;
  }

  public canReturnToCache(view: IView): boolean {
    return this.cache !== null && this.cache.length < this.cacheSize;
  }

  public tryReturnToCache(view: View): boolean {
    if (this.canReturnToCache(view)) {
      view.$cache(LifecycleFlags.none);
      this.cache.push(view);
      return true;
    }

    return false;
  }

  public create(): IView {
    const cache = this.cache;
    let view: View;

    if (cache !== null && cache.length > 0) {
      view = cache.pop();
      view.$state &= ~State.isCached;
      return view;
    }

    view = new View(this.lifecycle, this);
    this.template.render(view);
    if (!view.$nodes) {
      throw Reporter.error(90);
    }
    return view;
  }
}

function lockedBind(this: View, flags: LifecycleFlags): void {
  if (this.$state & State.isBound) {
    return;
  }

  flags |= LifecycleFlags.fromBind;
  const lockedScope = this.$scope;
  let current = this.$bindableHead;
  while (current !== null) {
    current.$bind(flags, lockedScope);
    current = current.$nextBind;
  }

  this.$state |= State.isBound;
}

((proto: IView): void => {
  proto.$bind = $bindView;
  proto.$unbind = $unbindView;
  proto.$attach = $attachView;
  proto.$detach = $detachView;
  proto.$cache = $cacheView;
  proto.$mount = $mountView;
  proto.$unmount = $unmountView;
})(View.prototype);
