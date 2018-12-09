# redam

[![npm](https://img.shields.io/npm/v/redam.svg?longCache=true&style=flat-square)](https://www.npmjs.com/package/redam)
[![npm](https://img.shields.io/npm/dm/redam.svg?longCache=true&style=flat-square)](https://www.npmjs.com/package/redam)
[![CircleCI](https://img.shields.io/circleci/project/github/chooslr/redam.svg?longCache=true&style=flat-square)](https://circleci.com/gh/chooslr/redam)
[![Coverage Status](https://img.shields.io/codecov/c/github/chooslr/redam.svg?longCache=true&style=flat-square)](https://codecov.io/github/chooslr/redam)
[![cdn](https://img.shields.io/badge/jsdelivr-latest-e84d3c.svg?longCache=true&style=flat-square)](https://cdn.jsdelivr.net/npm/redam/dist/min.js)
[![jspm](https://img.shields.io/badge/jspm-latest-fcea6d.svg?longCache=true&style=flat-square)](https://dev.jspm.io/redam)

Tiny hoc for container.

## Installation

```shell
yarn add react redam
```

## Usage

```js
import React from 'react'
import Redam from 'redam'

const initialState = { count: 0 }

const actions = {
  up: ({ state, payload, setState }) =>
    state('count')
    .then(count => setState({ count: count + payload.value }))
    .catch(err => console.error(err)),
    
  down: ({ state, payload, setState }) =>
    state('count')
    .then(count => setState({ count: count - payload.value }))
    .catch(err => console.error(err))
}

const Consumer = ({ provided, value }) =>
<main>
  <h1>{`count is ${provided.state.count}`}</h1>
  <button onClick={() => provided.dispatch('up', { value })}>
    {'+'}
  </button>
  <button onClick={() => provided.dispatch('down', { value })}>
    {'-'}
  </button>
</main>

const MyComponent = Redam(initialState, actions, Consumer)

export default MyComponent
```

```js
import React from 'react'
import MyComponent from './MyComponent.js'

export default () =>
<div>
  <MyComponent value={10} />
  <MyComponent value={20} />
  <MyComponent value={30} />
</div>
```

## API
### Redam(initialState, actions, Consumer[, options])

Component is the result.

#### initialState

Set in every mount. `prevState` is passed after second mount if `options.singleton: true`.

```js
// as object
const initialState = { [key]: value }
// as function
const initialState = (initialProps[, prevState]) => ({ [key]: value })
```

#### actions

`{ [name]: action }` or `{ [name]: action }[]`. (name must be unique)

```js
const action = (utils) => actionResult
```
##### utils
- `props(key[, clone]): Promise<props[key]>`
- `state(key[, clone]): Promise<state[key]>`
- `setState(updater[, callback]): Promise<void>`
- `forceUpdate(callback): Promise<void>`
- `dispatch(actionName, payload): Promise<actionResult>`
- `payload: any`

[`setState`](https://reactjs.org/docs/react-component.html#setstate) and [`forceUpdate`](https://reactjs.org/docs/react-component.html#forceupdate) return Promise for cancelable, but not be resolved until "didupdate". If hope so, need to pass `Promise.resolve` as callback.
```js
const action = async ({ setState, forceUpdate }) => {
  await new Promise(resolve => setState(updater, resolve))
  await new Promise(resolve => forceUpdate(resolve))
}
```

#### Consumer

Component that is passed props containing `provided`.

```js
const Consumer = ({ provided, ...props }) => ReactNode
```
##### provided
- `state`
- `dispatch` (same as action's util)

#### options
- `singleton: boolean = false`
- `providedKey: string = 'provided'`

## License

MIT (http://opensource.org/licenses/MIT)
