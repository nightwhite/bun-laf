import * as a from './a/b'

export default async function (ctx: FunctionContext) {
  a.default(ctx)
  console.log('test2')
  // throw new Error('eeee')
  return {
    data: 'test2',
  }
}
