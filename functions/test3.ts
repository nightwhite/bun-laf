async function basicImport() {
  const { default: _ } = await import('lodash')
  // 或者直接解构需要的方法

  console.log(_.padStart('hello', 10, '*')) // *****hello
}

export default async function (ctx: FunctionContext) {
  console.log('ok')

  await basicImport()

  // throw new Error('eeee')
  return {
    data: 'test3',
  }
}
