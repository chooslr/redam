import assert from 'power-assert'
import sinon from 'sinon'
import rewire from 'rewire'
import React from 'react'
import Enzyme from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import Redam from './index.js'
Enzyme.configure({ adapter: new Adapter() })

describe('cloneByRecursive', () => {
  const cloneByRecursive = rewire('./index.js').__get__('cloneByRecursive')
  const test = (data) => () => assert.deepEqual(data, cloneByRecursive(data))
  it('isArr', test({ key: 'value' }))
  it('isObj', test(['string', 100, true, {}, [], () => {}]))
})

describe('Redam() => throws', () => {
  const test = (...arg) => () => assert.throws(() => Redam(...arg), /[redam] /)
  const initialState = {}
  const actions = {}
  it('!initialState', test(undefined))
  it('!actions', test(initialState, undefined))
  it('!action', test(initialState, { key: 'not function' }))
  it('!Consumer', test(initialState, actions, undefined))
})

describe('duplicated => singleton === shouldThrowd', () => {

  const test = (options) => () => {
    const Component = Redam({}, {}, () => <div />, options)
    const elements = <Component />

    const shouldThrowd = options.singleton
    const wrapper1 = Enzyme.shallow(elements)
    try {
      const wrapper2 = Enzyme.shallow(elements)
      assert.ok(!shouldThrowd)
    } catch(err) {
      assert.ok(shouldThrowd)
    }
  }

  it('singleton: false', test({ singleton: false }))
  it('singleton: true', test({ singleton: true }))
})

describe('e2e', () => {

  const test = (options, type) => () => {
    const initialState = { count: 0 }

    const TEST = ({ props, state, payload, setState, forceUpdate, dispatch }) =>
      Promise.resolve()

      .then(() =>
        assert.equal(payload.persist.callCount, 1)
      )

      .then(() =>
        props('value')
        .then(value => assert.equal(value, payload.value))
      )

      .then(() =>
        state('count')
        .then(count => count + payload.value)
        .then(count => new Promise(resolve => setState({ count }, resolve)))
        .then(() => state('count'))
        .then(count => assert.equal(count, 0 + payload.value))
      )

      .then(() =>
        new Promise(resolve => forceUpdate(resolve))
      )

      .then(() =>
        dispatch('INVALID_NAME')
        .then(() => assert.ok(false))
        .catch(err => assert.ok(err))
      )

      .then(() =>
        Promise.resolve()
        .then(() => payload.wrapper.unmount())
        .then(() => forceUpdate())
        .then(() => assert.ok(false))
        .catch(err => assert.ok(true)) // redam => still unmounted
      )

      .then(payload.resolve)
      .catch(payload.reject)

    const Consumer = ({ value, provided: { state, dispatch } }) =>
      <main>
        <h1>{state.count}</h1>
        <button {...{
          id: 'test',
          onClick: (simulated) => dispatch('TEST', Object.assign({ value: +value }, simulated))
        }} />
      </main>

    const Component = Redam(initialState, { TEST }, Consumer, options)
    assert.ok(typeof Component.dispatch === type)

    const wrapper = Enzyme.mount(<Component {...{ value: 5 }} />)
    return new Promise((resolve, reject) =>
      wrapper
      .find(`#test`)
      .simulate(`click`, {
        wrapper,
        resolve,
        reject,
        persist: sinon.spy()
      })
    )
  }

  it('singleton: false', test({ singleton: false }, 'undefined'))
  it('singleton: true', test({ singleton: true }, 'function'))
})
