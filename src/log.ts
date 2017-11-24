import {createLogger, LoggerOptions} from 'bunyan'
import {Context} from './index'
import {keys, merge, pick} from 'lodash'

export default (options: LoggerOptions) => async <T>(context: Context<T>, next: () => Promise<void>): Promise<any> => {
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
