// @flow
import React from 'react'

// types
type Key = string
type Name = string
type Reference = boolean
type Payload = any
type PropsValue = any
type StateValue = any
type ActionResult = any
type RenderCallback = () => mixed

type Props = { [key: Key]: PropsValue }
type State = { [key: Key]: StateValue }
type InitialState = State | (initialProps: Props, prevState?: State) => State

type DispatchResult = Promise<ActionResult>
type DispatchFn = (name: Name, payload: Payload) => DispatchResult

type PropsFn = (key: Key, reference?: Reference) => Promise<PropsValue>
type StateFn = (key: Key, reference?: Reference) => Promise<StateValue>
type SetStateFn = (partialState: $Shape<State> | ((State, Props) => $Shape<State> | void), callback: RenderCallback) => Promise<void>
type ForceUpdateFn = (callback: RenderCallback) => Promise<void>

type CancelableFn<R> = (...arg: any) => CancelableResult<R>
type CancelableResult<R> = Promise<R>

type Action = (
  arg: {
    payload: Payload,
    dispatch: DispatchFn,
    props: PropsFn,
    state: StateFn,
    setState: SetStateFn,
    forceUpdate: ForceUpdateFn
  }
) => ActionResult

type Actions = { [name: Name]: Action }


// utils
const throws = (message) => { throw new Error(message) }
const asserts = (condition: boolean, message: string): false | void => !condition && throws(message)

const isReturn = (data: any): boolean %checks =>
  typeof data !== 'object' ||
  data === null

const isObject = (data: any): boolean %checks =>
  typeof data === 'object' &&
  !Array.isArray(data) &&
  data !== null

const isFunction = (data: any): boolean %checks =>
  typeof data === 'function'

const cloneByRecursive = (data: any): any =>
  isReturn(data) ? data :
  Array.isArray(data) ? data.map(content => cloneByRecursive(content)) :
  (obj => {
    Object
    .keys(data)
    .forEach(key => obj[key] = cloneByRecursive(data[key]))
    return obj
  })({})


// Store
export class RedamStore {
  isAttached: boolean
  prevState: void | State
  initialState: InitialState
  dispatch: DispatchFn
  use: { props?: PropsFn, state?: StateFn, setState?: SetStateFn, forceUpdate?: ForceUpdateFn }
  actions: Map<Name, Action>

  constructor(initialState: InitialState, actions: Actions | Actions[]): void {
    asserts(isObject(initialState) || isFunction(initialState), 'redam: initialState must be object || function')
    asserts(isObject(actions) || Array.isArray(actions), 'redam: actions must be object')

    this.isAttached = false
    this.prevState = undefined
    this.initialState = isFunction(initialState) ? initialState : cloneByRecursive(initialState)
    this.use = {}
    this.dispatch = (name, value) => this.action(name, value)
    this.actions = new Map()

    ;(Array.isArray(actions) ? actions : [actions]).forEach(actions =>
      Object.entries(actions).forEach(([ name, action ]) =>
        !isFunction(action)
        ? throws(`redam: ${name} is not function`)
        : this.actions.set(name, action)
      )
    )
  }

  fn2cancelable<R>(fn: (...arg: *) => R): CancelableFn<R> {
    return (...arg) =>
      new Promise((resolve, reject) =>
        this.isAttached
          ? resolve(fn(...arg))
          : reject(new Error('redam: still unmounted'))
      )
  }

  attach(instance: RedamProvider): void {

    instance.state = isFunction(this.initialState)
      ? this.initialState(instance.props.props, this.prevState)
      : this.initialState

    const props = (key, clone) =>
      clone ? cloneByRecursive(instance.props.props[key]) : instance.props.props[key]

    const state = (key, clone) =>
      clone ? cloneByRecursive(instance.state[key]) : instance.state[key]

    const setState = (...arg) =>
      instance.setState(...arg)

    const forceUpdate = (...arg) =>
      instance.forceUpdate(...arg)

    this.use.props = this.fn2cancelable(props)
    this.use.state = this.fn2cancelable(state)
    this.use.setState = this.fn2cancelable(setState)
    this.use.forceUpdate = this.fn2cancelable(forceUpdate)

    this.isAttached = true
  }

  detach(instance: RedamProvider): void {
    this.isAttached = false
    this.prevState = instance.state
    Object.keys(this.use).forEach(key => delete this.use[key])
  }

  action(name: Name, payload: Payload): DispatchResult {

    if (isObject(payload) && isFunction(payload.persist)) {
      payload.persist()
    }

    try {
      asserts(this.actions.has(name), `redam: ${name} is not registerd as action`)
      const action: any = this.actions.get(name);(action: Action)
      const { dispatch, use: { props, state, setState, forceUpdate } } = this
      const result = action({ payload, dispatch, props, state, setState, forceUpdate })
      return Promise.resolve(result)
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

// Component
type ConsumerProps = { [key: Key]: PropsValue, provided: { state: State, dispatch: DispatchFn } }
type ConsumerComponent = React$ComponentType<ConsumerProps>

type ProviderProps = { [key: Key]: PropsValue, store: RedamStore, Consumer: ConsumerComponent }
export class RedamProvider extends React.Component<ProviderProps, State> {
  constructor(props: ProviderProps): void {
    super(props)
    this.props.store.attach(this)
  }
  componentWillUnmount(): void {
    this.props.store.detach(this)
  }
  render() {
    const { props: { Consumer, props, store: { dispatch } }, state } = this
    return <Consumer {...props} provided={{ dispatch, state }} />
  }
}

export default (
  initialState: InitialState,
  actions: Actions | Actions[],
  Consumer: ConsumerComponent
): React$StatelessFunctionalComponent<Props> => {
  const store = new RedamStore(initialState, actions)
  const RedamComponent = (props) => <RedamProvider {...{ store, Consumer, props }} />
  RedamComponent.dispatch = store.dispatch
  return RedamComponent
}