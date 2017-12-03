import {Context, Middleware} from './index'
import {createLogger, LoggerOptions} from 'bunyan'
import {keys, merge, pick} from 'lodash'

export function compose<T>(middleware: Middleware<T>[]): Middleware<T> {
  return async (context: Context<T>, next?: () => Promise<void>) => {
    async function chain(middleware: Middleware<T>[]) {
      if (middleware.length === 0) return next && next()
      return middleware[0](context, () => chain(middleware.slice(1)))
    }

    return chain(middleware)
  }
}

export function logging(options: LoggerOptions) {
  return async <T>(context: Context<T>, next: () => Promise<void>): Promise<any> => {
    context.log = createLogger(options).child(pick(context.state, ['correlation']))
    context.log.info({message: context.body, headers: context.headers})

    let level = 'error', event
    try {
      await next()
      level = 'info'
      event = {status: 'OK'}
    } catch (error) {
      if (error.reject) {
        event = {status: 'rejected'}
      } else {
        level = 'warn'
        event = {status: 'requeued'}
      }
      event = merge(event, {cause: pick(error, ['name', 'message'].concat(keys(error)))})
      throw error
    } finally {
      context.log[level](event)
    }
  }
}
