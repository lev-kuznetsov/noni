import {Context} from '../src/index'
import {aws} from '../src/index'
import {expect} from 'chai'
import {SQS, SNS} from 'aws-sdk'

describe('AWS', () => {
  const sqsClientOptions: SQS.ClientConfiguration = {
    endpoint: 'http://localhost:4576',
    region: 'yolo'
  }

  it('should publish a message consume it', () => new Promise(async (resolve, reject) => {
    try {
      await aws.consumer([
        async (context: Context<SQS.Message>, next: () => Promise<void>): Promise<any> => {
          try {
            await next()
            resolve()
          } catch (error) {reject(error)}
        },
        aws.parse,
        async (context: Context<SQS.Message>): Promise<any> => {
          expect(context.body).to.have.property('hello', 'world')
        }
      ], {queue: 'q', sqsClientOptions})
      await aws.publisher([aws.assemble], {queue: 'q', sqsClientOptions})({hello: 'world'})
    } catch (error) {reject(error)}
  })).timeout(10000)
})
