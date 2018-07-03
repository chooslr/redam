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
  'COUNT_ADD': ({ payload, state, setState }) =>
    state('count')
    .then(count => count + payload.value)
    .then(count => setState({ count }, () => console.log('didupdate')))
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
const initialStateFn = (initialProps[, prevState]) => ({ [key]: value })
```

#### actions

`{ [name]: action }` or `{ [name]: action }[]`

```js
const action = (util) => actionResult
```
##### util
- `props(key[, clone]): Promise<props[key]>`
- `state(key[, clone]): Promise<state[key]>`
- [`setState`](https://reactjs.org/docs/react-component.html#setstate)
- [`forceUpdate`](https://reactjs.org/docs/react-component.html#forceupdate)
- `dispatch(actionName, payload): Promise<actionResult>`
- `payload: any`

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
