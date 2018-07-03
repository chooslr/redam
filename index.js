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
type PrevState = void | State
type InitialState = State | (initialProps: Props, prevState: PrevState) => State

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

type ActionsMap = Map<Name, Action>

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


// Dispatcher
class Dispatcher {
  actionsMap: ActionsMap
  isAttached: boolean
  prevState: PrevState
  initialState: InitialState
  dispatch: DispatchFn
  methods: { props?: PropsFn, state?: StateFn, setState?: SetStateFn, forceUpdate?: ForceUpdateFn }

  constructor(initialState: InitialState, actionsMap: Map<Name, Action>): void {
    this.actionsMap = actionsMap
    this.isAttached = false
    this.prevState = undefined
    this.initialState = initialState
    this.dispatch = (name, value) => this.action(name, value)
    this.methods = {}
  }

  fn2cancelable<R>(fn: (...arg: *) => R): CancelableFn<R> {
    return (...arg) =>
      new Promise((resolve, reject) =>
        this.isAttached
          ? resolve(fn(...arg))
          : reject(new Error('redam => still unmounted'))
      )
  }

  attach(instance: RedamProvider | RedamSingletonProvider): void {

    asserts(!this.isAttached, 'redam => dispatcher duplicated in tree')

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

    this.methods.props = this.fn2cancelable(props)
    this.methods.state = this.fn2cancelable(state)
    this.methods.setState = this.fn2cancelable(setState)
    this.methods.forceUpdate = this.fn2cancelable(forceUpdate)

    this.isAttached = true
  }

  detach(instance?: RedamSingletonProvider): void {
    this.isAttached = false
    this.prevState = instance && instance.state
    Object.keys(this.methods).forEach(key => delete this.methods[key])
  }

  action(name: Name, payload: Payload): DispatchResult {

    if (isObject(payload) && isFunction(payload.persist)) {
      payload.persist()
    }

    try {
      asserts(this.actionsMap.has(name), `redam => ${name} is not registerd as action`)
      const action: any = this.actionsMap.get(name);(action: Action)
      const { dispatch, methods: { props, state, setState, forceUpdate } } = this
      const result = action({ payload, dispatch, props, state, setState, forceUpdate })
      return Promise.resolve(result)
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

// Components
type ConsumerComponent = React$ComponentType<{
  [key: Key]: PropsValue,
  provided: {
    state: State,
    dispatch: DispatchFn
  }
}>

type ProviderProps = {
  [key: Key]: PropsValue,
  Consumer: ConsumerComponent,
  initialState: InitialState,
  actionsMap: ActionsMap
}

class RedamProvider extends React.Component<ProviderProps, State> {
  dispatcher: Dispatcher
  constructor(props: ProviderProps): void {
    super(props)
    this.dispatcher = new Dispatcher(props.initialState, props.actionsMap)
    this.dispatcher.attach(this)
  }
  componentWillUnmount(): void {
    this.dispatcher.detach()
  }
  render() {
    const { props: { Consumer, props }, dispatcher: { dispatch }, state } = this
    return <Consumer {...props} provided={{ dispatch, state }} />
  }
}

type SingletonProviderProps = {
  [key: Key]: PropsValue,
  Consumer: ConsumerComponent,
  dispatcher: Dispatcher
}

class RedamSingletonProvider extends React.Component<SingletonProviderProps, State> {
  constructor(props: ProviderProps): void {
    super(props)
    this.props.dispatcher.attach(this)
  }
  componentWillUnmount(): void {
    this.props.dispatcher.detach(this)
  }
  render() {
    const { props: { Consumer, props, dispatcher: { dispatch } }, state } = this
    return <Consumer {...props} provided={{ dispatch, state }} />
  }
}

type Options = {
  singleton?: boolean
}

export default (
  initialState: InitialState,
  actions: Actions | Actions[],
  Consumer: ConsumerComponent,
  options: Options = {}
): React$StatelessFunctionalComponent<Props> => {
  asserts(isObject(initialState) || isFunction(initialState), 'redam => initialState must be object || function')
  asserts(isObject(actions) || Array.isArray(actions), 'redam => actions must be object')
  asserts(isFunction(Consumer), 'redam => require Consumer')

  initialState = isFunction(initialState)
    ? initialState
    : cloneByRecursive(initialState)

  const hoc = options.singleton ? createSingletonComponent : createComponent
  const actionsMap = createActions(actions)
  return hoc(Consumer, initialState, actionsMap)
}

const createActions = (actions: Actions | Actions[]): ActionsMap =>
  new Map(
    (Array.isArray(actions) ? actions : [actions])
    .map(Object.entries)
    .reduce((a, entries) => a.concat(entries), [])
    .map(([ name, action ]) =>
      !isFunction(action)
      ? throws(`redam => ${name} is not function`)
      : [ name, action ]
    )
  )

const createComponent = (Consumer, initialState, actionsMap) => {
  const RedamComponent = (props) => <RedamProvider {...{ Consumer, props, initialState, actionsMap }} />
  return RedamComponent
}

const createSingletonComponent = (Consumer, initialState, actionsMap) => {
  const dispatcher = new Dispatcher(initialState, actionsMap)
  const RedamSingletonComponent = (props) => <RedamSingletonProvider {...{ Consumer, props, dispatcher }} />
  RedamSingletonComponent.dispatch = dispatcher.dispatch
  return RedamSingletonComponent
}