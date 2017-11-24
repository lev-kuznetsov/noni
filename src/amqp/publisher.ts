import {Channel, ConfirmChannel} from 'amqplib'
import {Context, Middleware, Publish} from '../index'
import compose from '../compose'
import {pick} from 'lodash'

export default (middleware: Middleware<Buffer>[], options: {
  channel: Channel | ConfirmChannel
  exchange?: string
  route: string
}): Publish => {
  const {channel, exchange, route} = options
  const handlers = compose(middleware)
  return async body => {
    const context = {body} as Context<Buffer>
    await handlers(context, async () => {
      await channel.publish(exchange || '', route, context.message, pick(context, ['headers']))
    })
  }
}
