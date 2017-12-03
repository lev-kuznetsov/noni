import {Context} from '../src/index'
import {compose, logging as log} from '../src/common'
import {sandbox} from 'sinon'
import {expect} from 'chai'
import {extend} from 'lodash'
import * as Logger from 'bunyan'

describe('Compose middleware', () => {
  const mock = sandbox.create()

  afterEach(() => mock.restore())

  it('should continue to next middleware', async () => {
    let next = mock.spy()
    await compose([async (_, next) => next()])(<Context<any>>{}, next)
    expect(next.calledOnce)
  })

  it('should not continue to next middleware if chain is shortcut', async () => {
    let next = mock.spy()
    await compose([async (_, next) => {}])(<Context<any>>{}, next)
    expect(next.called).not
  })

  it('should not continue to next middleware if error thrown', async () => {
    let next = mock.spy()
    try {
      await compose([async () => {
        throw new Error('yolo')
      }])(<Context<any>>{}, next)
      expect(false)
    } catch (error) {
      expect(next.called).not
      expect(error.message).eql('yolo')
    }
  })

  it('should continue to next middleware recursively', async () => {
    let next = mock.spy()
    try {
      await compose([async (_, next) => {
        await next()
        throw new Error('yolo')
      }])(<Context<any>>{}, next)
      expect(false)
    } catch (error) {
      expect(next.called)
      expect(error.message).eql('yolo')
    }
  })

  it('should chain middleware left to right', async () => {
    let context = {state: {value: 1}} as Context<any>
    await compose([
      async (context, next) => {
        context.state.value += 1
        return next()
      },
      async (context, next) => {
        context.state.value *= 2
        return next()
      }
    ])(context, async () => {})
    expect(context.state.value).eql(4)
  })
})

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
