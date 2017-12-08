import {SNS, SQS} from 'aws-sdk'
import {compose, Context, Middleware, Publish} from './index'
import {extend, mapValues, merge} from 'lodash'

export async function assemble(context: Context<string>, next: () => Promise<void>): Promise<any> {
  context.message = JSON.stringify(context.body)
  context.headers['content-type'] = 'application/json'

  return next()
}

export async function consumer(middleware: Middleware<SQS.Message>[], options: {
  queue: string,
  sqsClientOptions?: SQS.ClientConfiguration,
  pollTimeoutInMillis?: number,
  visibilityTimeoutInSeconds?: number,
  waitTimeInSeconds?: number,
  maxNumberOfMessages?: number
}) {
  const {
    queue,
    sqsClientOptions,
    visibilityTimeoutInSeconds,
    waitTimeInSeconds,
    pollTimeoutInMillis,
    maxNumberOfMessages
  } = options
  const sqs = new SQS(sqsClientOptions)
  const queueUrl = (await sqs.createQueue({QueueName: queue}).promise()).QueueUrl
  const handle = compose([async (context: Context<SQS.Message>, next: () => Promise<void>): Promise<any> => {
    let remove = true
    try {await next()}
    catch (error) {remove = error.reject}
    finally {
      if (remove) sqs.deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: context.message.ReceiptHandle
      })
    }
  }].concat(middleware))
  setInterval(() => sqs.receiveMessage({
    QueueUrl: queueUrl,
    AttributeNames: ['All'],
    MessageAttributeNames: ['All'],
    MaxNumberOfMessages: maxNumberOfMessages || 10,
    VisibilityTimeout: visibilityTimeoutInSeconds,
    WaitTimeSeconds: waitTimeInSeconds
  }, (error, result) => {
    if (!error && result.Messages) result.Messages.map(message => handle(<Context<SQS.Message>>{
      message,
      headers: merge(
        {},
        message.Attributes,
        mapValues(message.MessageAttributes, attribute => attribute.StringValue)),
      state: {}
    }))
  }), pollTimeoutInMillis).unref()
}

export async function parse(context: Context<SQS.Message>, next: () => Promise<void>): Promise<any> {
  if (context.headers['content-type'] !== 'application/json')
    throw extend(new Error('Unsupported content type'), {context, reject: true})
  context.body = JSON.parse(context.message.Body)

  return next()
}

export function publisher(middleware: Middleware<string>[], options: {
  queue: string
  sqsClientOptions?: SQS.ClientConfiguration
}): Publish {
  const handlers = compose(middleware)
  const sqs = new SQS(options.sqsClientOptions)
  const queue = sqs.createQueue({QueueName: options.queue}).promise()
  return async body => {
    const url = (await queue).QueueUrl
    const context = {headers: {}, state: {}, body} as Context<string>
    await handlers(context, async () => {
      await sqs.sendMessage({
        QueueUrl: url,
        MessageBody: context.message,
        MessageAttributes: mapValues(context.headers, value => ({
          DataType: 'String',
          StringValue: typeof value === 'string' ? value : JSON.stringify(value)
        }))
      }).promise()
    })
  }
}
