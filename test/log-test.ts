import {sandbox} from 'sinon'
import * as Logger from 'bunyan'
import log from '../src/log'
import {expect} from 'chai'
import {Context} from '../src/index'
import {extend} from 'lodash'

const mock = sandbox.create()
const create = mock.stub(Logger, 'createLogger')

beforeEach(() => create.returns({
  child: mock.stub().returns({info: mock.stub(), warn: mock.stub(), error: mock.stub()})
}))

afterEach(() => mock.reset())

describe('Logging middleware', () => {
  let middleware

  beforeEach(() => {
    middleware = log({name: 'yolo'})
  })

  it('should continue to next middleware', async () => {
    let next = mock.spy()
    await middleware(<Context<any>>{state: {}}, next)
    expect(next.calledOnce)
  })

  it('should use specified options', async () => {
    expect(create.calledWith({name: 'yolo'}))
  })

  it('should use correlation data if available', async () => {
    await middleware(<Context<any>>{state: {correlation: 'yolo'}}, async () => {})
    expect(create().child.calledWith('yolo'))
  })

  it('should log message body and headers', async () => {
    const {body, headers} = {body: 'foo', headers: 'bar'}
    await middleware(<Context<any>>{state: {}, body, headers}, async () => {})
    expect(create().child().info.calledWith({message: body, headers}))
  })

  it('should log OK status on success', async () => {
    await middleware(<Context<any>>{state: {}}, async () => {})
    expect(create().child().info.calledWith({status: 'OK'}))
  })

  it('should log warning on requeue', async () => {
    try {
      await middleware(<Context<any>>{state: {}}, async () => {throw new Error()})
    } catch (error) {}
    expect(create().child().warn.called)
  })

  it('should log error on reject', async () => {
    try {
      await middleware(<Context<any>>{state: {}}, async () => {throw extend(new Error(), {reject: true})})
    } catch (error) {}
    expect(create().child().error.called)
  })
})
