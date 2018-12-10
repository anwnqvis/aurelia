import { IDisposable, IIndexable, IServiceLocator } from '@aurelia/kernel';
import { INode } from '../dom';
import { IBindScope, State } from '../lifecycle';
import { IScope, LifecycleFlags } from '../observation';
import { hasBind, hasUnbind, IsBindingBehavior } from './ast';
import { IBinding } from './binding';
import { IConnectableBinding } from './connectable';
import { DelegationStrategy, IEventManager } from './event-manager';
import { INsNode } from '../ns-dom';
import { EventData } from 'tns-core-modules/ui/page/page';

export interface Listener extends IConnectableBinding {}
export class Listener implements IBinding {
  public $nextBind: IBindScope;
  public $prevBind: IBindScope;
  public $state: State;
  public $scope: IScope;

  public delegationStrategy: DelegationStrategy;
  public locator: IServiceLocator;
  public preventDefault: boolean;
  public sourceExpression: IsBindingBehavior;
  public target: INsNode;
  public targetEvent: string;

  private eventManager: IEventManager;
  private handler: IDisposable;

  constructor(targetEvent: string, delegationStrategy: DelegationStrategy, sourceExpression: IsBindingBehavior, target: INsNode, preventDefault: boolean, eventManager: IEventManager, locator: IServiceLocator) {
    this.$nextBind = null;
    this.$prevBind = null;
    this.$state = State.none;

    this.delegationStrategy = delegationStrategy;
    this.locator = locator;
    this.preventDefault = preventDefault;
    this.sourceExpression = sourceExpression;
    this.target = target;
    this.targetEvent = targetEvent;

    this.eventManager = eventManager;
    this.handleEvent = this.handleEvent.bind(this);
  }

  public callSource(event: EventData): ReturnType<IsBindingBehavior['evaluate']> {
    const overrideContext = this.$scope.overrideContext;
    overrideContext['$event'] = event;

    const result = this.sourceExpression.evaluate(LifecycleFlags.mustEvaluate, this.$scope, this.locator);

    delete overrideContext['$event'];

    // if (result !== true && this.preventDefault) {
    //   event.preventDefault();
    // }

    return result;
  }

  public handleEvent(event: EventData): void {
    this.callSource(event);
  }

  public $bind(flags: LifecycleFlags, scope: IScope): void {
    if (this.$state & State.isBound) {
      if (this.$scope === scope) {
        return;
      }

      this.$unbind(flags | LifecycleFlags.fromBind);
    }
    // add isBinding flag
    this.$state |= State.isBinding;

    this.$scope = scope;

    const sourceExpression = this.sourceExpression;
    if (hasBind(sourceExpression)) {
      sourceExpression.bind(flags, scope, this);
    }

    this.target.on(this.targetEvent, this.handleEvent);

    // this.handler = this.eventManager.addEventListener(
    //   this.target,
    //   this.targetEvent,
    //   this,
    //   this.delegationStrategy
    // );

    // add isBound flag and remove isBinding flag
    this.$state |= State.isBound;
    this.$state &= ~State.isBinding;
  }

  public $unbind(flags: LifecycleFlags): void {
    if (!(this.$state & State.isBound)) {
      return;
    }
    // add isUnbinding flag
    this.$state |= State.isUnbinding;

    const sourceExpression = this.sourceExpression;
    if (hasUnbind(sourceExpression)) {
      sourceExpression.unbind(flags, this.$scope, this);
    }

    this.$scope = null;
    this.handler.dispose();
    this.handler = null;

    // remove isBound and isUnbinding flags
    this.$state &= ~(State.isBound | State.isUnbinding);
  }

  public observeProperty(obj: IIndexable, propertyName: string): void {
    return;
  }

  public handleChange(newValue: unknown, previousValue: unknown, flags: LifecycleFlags): void {
    return;
  }
}
