import {connect, Message} from 'amqplib'
import {Context} from '../src/index'
import {amqp} from '../src/index'
import {expect} from 'chai'

describe('AMQP', () => {
  let connection

  before(async () => {
    connection = await connect('amqp://localhost')
  })
  after(async () => {
    await connection.close()
  })

  it('should publish a message and consume it', () => new Promise(async (resolve, reject) => {
    try {
      let c1 = await connection.createChannel(), c2 = await connection.createChannel()

      await amqp.consumer([
        async (context: Context<Message>, next: () => Promise<void>): Promise<any> => {
          try {
            await next()
            resolve()
          } catch (error) {reject(error)}
        },
        amqp.parse,
        async (context: Context<Message>): Promise<any> => {
          expect(context.body).to.have.property('hello', 'world')
        }
      ], {channel: c2, exchange: 'e', route: 'r'})
      await amqp.publisher([amqp.assemble], {channel: c1, exchange: 'e', route: 'r'})({hello: 'world'})
    } catch (error) {reject(error)}
  }))
})
