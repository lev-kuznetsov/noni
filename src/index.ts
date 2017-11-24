import * as Logger from 'bunyan'
import {extend} from 'lodash'

export interface Context<T> {
  message: T
  body: any
  headers: any
  state: any

  log: Logger
}

export type Middleware<T> = (context: Context<T>, next?: () => Promise<void>) => Promise<any>

export type Publish = (body: any) => Promise<void>
