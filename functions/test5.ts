// import Config from 'src/config/Config'

// import Config from '@/src/config/Config'

export default async function (ctx: FunctionContext) {
  // await import，路径是基于 项目根目录来的
  const { tee } = await import('tests/test')
  await tee()
  console.log('ok')

  // console.log(Config.WORKSPACE_PATH)

  // throw new Error('eeee')
  return {
    data: 'test4',
  }
}
