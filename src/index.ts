import * as Logger from 'bunyan'
import * as AMQP from './amqp'
import * as AWS from './aws'

export interface Context<T> {
  message: T
  body: any
  headers: any
  state: any

  log: Logger
}

export type Middleware<T> = (context: Context<T>, next?: () => Promise<void>) => Promise<any>

export type Publish = (body: any) => Promise<void>

export const amqp = AMQP
export const aws = AWS
export * from './common'
