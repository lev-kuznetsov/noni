import {Context} from '../src/index'
import compose from '../src/compose'
import {sandbox} from 'sinon'
import {expect} from 'chai'

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
