import assemble from '../src/amqp/assemble'
import {sandbox, createStubInstance} from 'sinon'
import {Context} from '../src/index'
import {expect} from 'chai'
import {Channel, Message} from 'amqplib'
import parse from '../src/amqp/parse'

describe('AMQP', () => {
  const mock = sandbox.create()

  afterEach(() => mock.reset())

  describe('assemble middleware', () => {
    let context

    beforeEach(() => {
      context = {body: {hello: 'world'}, headers: {}} as Context<Buffer>
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

    it('should set default content encoding header', async () => {
      await assemble(context, async () => {
        expect(context.headers['content-encoding']).eql('utf8')
      })
    })

    it('should assemble message with default encoding', async () => {
      await assemble(context, async () => {
        expect(context.message.toString()).eql('{"hello":"world"}')
      })
    })

    it('should assemble message with set encoding', async () => {
      context.headers['content-encoding'] = 'base64'
      await assemble(context, async () => {
        expect(context.message.toString('base64')).eql('helloworlQ==')
      })
    })
  })

  describe('parsing middleware', () => {
    let context

    beforeEach(() => {
      context = {
        message: {
          content: Buffer.from(JSON.stringify({hello: 'world'}))
        }, headers: {
          'content-type': 'application/json',
          'content-encoding': 'utf8'
        }
      } as Context<Message>
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

  describe('publisher', () => {
    let channel = {publish: mock.stub()}


  })
})
