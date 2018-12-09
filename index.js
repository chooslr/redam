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

type SetStateFn = (
  partialState: $Shape<State> | ((State, Props) => $Shape<State> | void),
  callback: RenderCallback
) => Promise<void>

type ForceUpdateFn = (
  callback: RenderCallback
) => Promise<void>

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
const asserts = (condition: boolean, message: string): false | void =>
  !condition && throws(message)

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
    this.dispatch = (name, payload) => this.action(name, payload)
    this.methods = {}
  }

  makeCancelable<R>(fn: (...arg: *) => R): CancelableFn<R> {
    return (...arg) =>
      new Promise((resolve, reject) =>
        this.isAttached
          ? resolve(fn(...arg))
          : reject(new Error('[redam] still unmounted'))
      )
  }

  attach(instance: RedamProvider | RedamSingletonProvider): void {

    asserts(!this.isAttached, '[redam] dispatcher duplicated in tree')

    instance.state = isFunction(this.initialState)
      ? this.initialState(instance.props['userProps'], this.prevState)
      : this.initialState

    const props = (key, clone) =>
      clone
      ? cloneByRecursive(instance.props['userProps'][key])
      : instance.props['userProps'][key]

    const state = (key, clone) =>
      clone
      ? cloneByRecursive(instance.state[key])
      : instance.state[key]

    const setState = (...arg) =>
      instance.setState(...arg)

    const forceUpdate = (...arg) =>
      instance.forceUpdate(...arg)

    this.methods.props = this.makeCancelable(props)
    this.methods.state = this.makeCancelable(state)
    this.methods.setState = this.makeCancelable(setState)
    this.methods.forceUpdate = this.makeCancelable(forceUpdate)

    this.isAttached = true
  }

  detach(): void {
    this.isAttached = false
    Object.keys(this.methods).forEach(key => delete this.methods[key])
  }

  detachSingleton(prevState: State): void {
    this.detach()
    this.prevState = prevState
  }

  action(name: Name, payload: Payload): DispatchResult {

    if (isObject(payload) && isFunction(payload.persist)) {
      payload.persist()
    }

    try {
      asserts(this.actionsMap.has(name), `[redam] ${name} is not registerd as action`)
      const action: any = this.actionsMap.get(name);(action: Action)
      const { dispatch, methods: { props, state, setState, forceUpdate } } = this
      const result = action({ payload, dispatch, props, state, setState, forceUpdate })
      return Promise.resolve(result)
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

const actions2map = (actions: Actions | Actions[]): ActionsMap =>
  new Map(
    (Array.isArray(actions) ? actions : [actions])
    .map(Object.entries)
    .reduce((a, entries) => a.concat(entries), [])
    .map(([ name, action ]) =>
      !isFunction(action)
      ? throws(`[redam] ${name} is not function`)
      : [ name, action ]
    )
  )

type ProvidedKey = string

type Provided = {
  state: State,
  dispatch: DispatchFn
}

type ConsumerProps = {
  [key: Key]: PropsValue,
  [providedKey: ProvidedKey]: Provided
}

type ConsumerComponent = React$ComponentType<ConsumerProps>

type Options = {
  singleton?: boolean,
  providedKey?: ProvidedKey,
}

const PROVIDED_KEY = 'provided'

export default (
  initialState: InitialState,
  actions: Actions | Actions[],
  Consumer: ConsumerComponent,
  options: Options = {}
): React$StatelessFunctionalComponent<Props> => {
  
  asserts(
    isObject(initialState) || isFunction(initialState),
    '[redam] initialState must be object || function')
  asserts(
    isObject(actions) || Array.isArray(actions),
    '[redam] actions must be object || array')
  asserts(
    isFunction(Consumer),
    '[redam] Consumer is required')
  asserts(
    !options['providedKey'] || typeof options['providedKey'] === 'string',
    '[redam] providedKey must be string')

  initialState = isFunction(initialState)
  ? initialState
  : cloneByRecursive(initialState)
  
  const hoc = options.singleton
  ? createSingletonComponent
  : createComponent
  
  return hoc(Consumer, initialState, actions2map(actions), {
    providedKey: options['providedKey'] || PROVIDED_KEY
  })
}

const createComponent = (Consumer, initialState, actionsMap, options) => {
  const RedamComponent = (userProps) =>
  <RedamProvider {...{
    userProps,
    Consumer,
    initialState,
    actionsMap,
    options
  }} />
  
  return RedamComponent
}

type ProviderProps = {
  userProps: Props,
  Consumer: ConsumerComponent,
  initialState: InitialState,
  actionsMap: ActionsMap,
  options: {
    providedKey: ProvidedKey
  }
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
    const {
      state,
      dispatcher: { dispatch },
      props: {
        Consumer,
        userProps,
        options: { providedKey }
      },
    } = this
    
    return <Consumer
      {...userProps}
      {...{ [providedKey]: { dispatch, state } }}
    />
  }
}

const createSingletonComponent = (Consumer, initialState, actionsMap, options) => {
  const dispatcher = new Dispatcher(initialState, actionsMap)
  
  const RedamSingletonComponent = (userProps) =>
  <RedamSingletonProvider {...{
    userProps,
    Consumer,
    dispatcher,
    options
  }} />
  
  RedamSingletonComponent.dispatch = dispatcher.dispatch
  return RedamSingletonComponent
}

type SingletonProviderProps = {
  userProps: Props,
  Consumer: ConsumerComponent,
  dispatcher: Dispatcher,
  options: {
    providedKey: ProvidedKey
  }
}

class RedamSingletonProvider extends React.Component<SingletonProviderProps, State> {
  constructor(props: ProviderProps): void {
    super(props)
    this.props.dispatcher.attach(this)
  }
  componentWillUnmount(): void {
    this.props.dispatcher.detachSingleton(this.state)
  }
  render() {
    const {
      state,
      props: {
        Consumer,
        userProps,
        dispatcher: { dispatch },
        options: { providedKey }
      }
    } = this
    
    return <Consumer
      {...userProps}
      {...{ [providedKey]: { dispatch, state } }}
    />
  }
}