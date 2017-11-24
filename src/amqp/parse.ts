import {Message} from 'amqplib'
import {Context} from '../index'
import {extend} from 'lodash'

export default async (context: Context<Message>, next: () => Promise<void>): Promise<any> => {
  if (context.headers['content-type'] !== 'application/json')
    throw extend(new Error('Unsupported content type'), {context, reject: true})
  context.body = JSON.parse(context.message.content.toString(context.headers['content-encoding']))

  return next()
}
