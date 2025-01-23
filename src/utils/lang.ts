import { transpile, ModuleKind, ScriptTarget } from 'typescript'

export function compileTs2js(source: string, name: string) {
  const jscode = transpile(
    source,
    {
      module: ModuleKind.NodeNext,
      target: ScriptTarget.ESNext,
      removeComments: true,
      inlineSourceMap: true,
    },
    `${name}.ts`,
    undefined,
    name,
  )
  return jscode
}
