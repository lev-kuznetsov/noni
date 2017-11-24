import {Channel, ConfirmChannel, Message, Options} from 'amqplib'
import {Context, Middleware} from '../index'
import compose from '../compose'
import {assign} from 'lodash'

export default async (middleware: Middleware<Message>[], options: {
  channel: Channel | ConfirmChannel
  exchange?: string
  route: string
  exchangeType?: string
  exchangeOptions?: Options.AssertExchange
  queueOptions?: Options.AssertQueue
  consumeOptions?: Options.Consume
}) => {
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
    message
  } as Context<Message>), consumeOptions)
}
