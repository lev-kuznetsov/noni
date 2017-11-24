import {Context} from '../index'

export default async (context: Context<Buffer>, next: () => Promise<void>): Promise<any> => {
  context.headers['content-type'] = 'application/json'
  const encoding = context.headers['content-encoding'] = context.headers['content-encoding'] || 'utf8'
  context.message = Buffer.from(JSON.stringify(context.body), encoding)

  return next()
}
