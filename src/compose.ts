import {Context, Middleware} from './index'

export default <T>(middleware: Middleware<T>[]): Middleware<T> => {
  return async (context: Context<T>, next?: () => Promise<void>) => {
    async function chain(middleware: Middleware<T>[]) {
      if (middleware.length === 0) return next && next()
      return middleware[0](context, () => chain(middleware.slice(1)))
    }

    return chain(middleware)
  }
}
