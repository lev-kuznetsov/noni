import {Channel, ConfirmChannel, Message, Options} from 'amqplib'
import {Context, Middleware, Publish} from './index'
import {compose} from './common'
import {assign, extend, pick} from 'lodash'

export async function assemble(context: Context<Buffer>, next: () => Promise<void>): Promise<any> {
  context.headers['content-type'] = 'application/json'
  const encoding = context.headers['content-encoding'] = context.headers['content-encoding'] || 'utf8'
  context.message = Buffer.from(JSON.stringify(context.body), encoding)

  return next()
}

export async function consumer(middleware: Middleware<Message>[], options: {
  channel: Channel | ConfirmChannel
  exchange?: string
  route: string
  exchangeType?: string
  exchangeOptions?: Options.AssertExchange
  queueOptions?: Options.AssertQueue
  consumeOptions?: Options.Consume
}) {
  const {channel, exchange, route, exchangeType, exchangeOptions, queueOptions, consumeOptions} = options
  const {queue} = await channel.assertQueue(exchange ? null : route, queueOptions)
  if (exchange) {
    await channel.assertExchange(exchange, exchangeType, exchangeOptions)
    await channel.bindQueue(queue, exchange, route)
  }
  const handlers = compose([
    async (context: Context<Message>, next: () => Promise<void>): Promise<any> => {
      try {await next()}
      catch (error) {await channel.nack(context.message, false, !error.reject)}
    }
  ].concat(middleware))
  await channel.consume(queue, message => handlers({
    headers: message.properties.headers,
    message,
    state: {}
  } as Context<Message>), consumeOptions)
}

export async function parse(context: Context<Message>, next: () => Promise<void>): Promise<any> {
  if (context.headers['content-type'] !== 'application/json')
    throw extend(new Error('Unsupported content type'), {context, reject: true})
  context.body = JSON.parse(context.message.content.toString(context.headers['content-encoding']))

  return next()
}

export function publisher(middleware: Middleware<Buffer>[], options: {
  channel: Channel | ConfirmChannel
  exchange?: string
  route: string
}): Publish {
  const {channel, exchange, route} = options
  const handlers = compose(middleware)
  return async body => {
    const context = {headers: {}, body, state: {}} as Context<Buffer>
    await handlers(context, async () => {
      await channel.publish(exchange || '', route, context.message, pick(context, ['headers']))
    })
  }
}
