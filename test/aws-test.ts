import {assemble, parse} from '../src/aws'
import {sandbox} from 'sinon'
import {Context} from '../src/index'
import {expect} from 'chai'
import {SQS} from 'aws-sdk'

describe('AWS', () => {
  const mock = sandbox.create()

  afterEach(() => mock.reset())

  describe('assemble middleware', () => {
    let context

    beforeEach(() => {
      context = {body: {hello: 'world'}, headers: {}} as Context<string>
    })

    it('should continue to next middleware', async () => {
      let next = mock.stub()
      await assemble(context, next)
      expect(next.calledOnce)
    })

    it('should set content type header', async () => {
      await assemble(context, async () => {
        expect(context.headers['content-type']).eql('application/json')
      })
    })

    it('should assemble message with default encoding', async () => {
      await assemble(context, async () => {
        expect(context.message).eql('{"hello":"world"}')
      })
    })
  })

  describe('parsing middleware', () => {
    let context

    beforeEach(() => {
      context = {
        message: {
          Body: '{"hello":"world"}'
        }, headers: {
          'content-type': 'application/json',
          'content-encoding': 'utf8'
        }
      } as Context<SQS.Message>
    })

    it('should continue to next middleware', async () => {
      let next = mock.stub()
      await parse(context, next)
      expect(next.calledOnce)
    })

    it('should throw out message on incompatible content type', async () => {
      try {
        context.headers['content-type'] = 'nope'
        await parse(context, async () => {
          expect(false)
        })
      } catch (error) {
        expect(error).to.have.property('reject', true)
      }
    })

    it('should parse message', async () => {
      await parse(context, async () => {
        expect(context.body).eql({hello: 'world'})
      })
    })
  })
})
