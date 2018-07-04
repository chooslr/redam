# redam

[![npm](https://img.shields.io/npm/v/redam.svg?longCache=true&style=flat-square)](https://www.npmjs.com/package/redam)
[![npm](https://img.shields.io/npm/dm/redam.svg?longCache=true&style=flat-square)](https://www.npmjs.com/package/redam)
[![CircleCI](https://img.shields.io/circleci/project/github/chooslr/redam.svg?longCache=true&style=flat-square)](https://circleci.com/gh/chooslr/redam)
[![Coverage Status](https://img.shields.io/codecov/c/github/chooslr/redam.svg?longCache=true&style=flat-square)](https://codecov.io/github/chooslr/redam)
[![cdn](https://img.shields.io/badge/jsdelivr-latest-e84d3c.svg?longCache=true&style=flat-square)](https://cdn.jsdelivr.net/npm/redam/dist/min.js)

Management state with async actions.

[![image](https://www.ana-cooljapan.com/destinations/img/toyama/kurobedam/main.jpg)](https://www.ana-cooljapan.com/destinations/toyama/kurobedam)


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
  'COUNT_ADD': ({ state, payload, setState }) =>
    state('count')
    .then(count => setState({ count: count + payload.value }, () => console.log('didupdate')))
    .catch(err => console.error(err))
}

const Consumer = ({ provided, value }) =>
<main>
  <h1>{provided.state.count}</h1>
  <button onClick={(e) => provided.dispatch('COUNT_ADD', { value: +value })}>+</button>
  <button onClick={(e) => provided.dispatch('COUNT_ADD', { value: -value })}>-</button>
</main>

export default Redam(initialState, actions, Consumer)
```

```js
import React from 'react'
import MyComponent from './MyComponent.js'

export default () => <MyComponent value={10} />
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

[`setState`](https://reactjs.org/docs/react-component.html#setstate) and [`forceUpdate`](https://reactjs.org/docs/react-component.html#forceupdate) return Promise (for make it cancelable) but not to await until "didupdate". If hope so, need to pass `Promise.resolve` as callback.
```js
const action = async ({ setState, forceUpdate }) => {
  await new Promise(resolve => setState(updater, resolve))
  await new Promise(resolve => forceUpdate(resolve))
}
```

#### Consumer
```js
const Consumer = ({ provided, ...props }) => ReactNode
```
##### provided
- `state`
- `dispatch` (same as action util)

#### options
- `singleton: boolean`

## License

MIT (http://opensource.org/licenses/MIT)
