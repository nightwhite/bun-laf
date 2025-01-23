import * as path from 'node:path'
import * as vm from 'node:vm'
import type { Context, RunningScriptInNewContextOptions, ScriptOptions } from 'node:vm'

import Config from '../../config/Config'
import { Console, systemLogger } from '../../utils/logger.js'
import { FunctionCache } from '../cache/FunctionCache'

interface Module {
  exports: Record<string, unknown>
}

export interface FunctionModuleGlobalContext {
  __filename: string
  module: Module
  exports: Module['exports']
  console: Console
  __require: typeof FunctionModule.functionsImport
  RegExp: typeof RegExp
  Buffer: typeof Buffer
  Float32Array: typeof Float32Array
  setInterval: typeof setInterval
  clearInterval: typeof clearInterval
  setTimeout: typeof setTimeout
  clearTimeout: typeof clearTimeout
  setImmediate: typeof setImmediate
  clearImmediate: typeof clearImmediate
  Promise: typeof Promise
  process: typeof process
  URL: typeof URL
  fetch: typeof fetch
  global: unknown
  __from_modules: string[]
}

export class FunctionModule {
  // Cache for loaded modules
  private static moduleCache: Map<string, Module['exports']> = new Map()

  /**
   * Get a function module by name
   * @param functionName Function name to load
   * @returns Module exports
   * @throws Error if function not found
   */
  static get(functionName: string): Module['exports'] | void {
    if (!functionName) {
      throw new Error('Function name is required')
    }
    const moduleName = `@/${functionName}`
    return this.functionsImport(moduleName, [], '')
  }

  /**
   * Require a module by name
   * @param moduleName Module name to require
   * @param fromModule Array of parent module names (for circular dependency detection)
   * @param filename Current filename
   * @returns Module exports
   * @throws Error if module not found or circular dependency detected
   */
  static functionsImport(
    moduleName: string,
    fromModule: string[],
    filename: string,
  ): Module['exports'] | void {
    let currentFileName = filename
    try {
      // handle some special imports in functions
      // if (moduleName === '@/cloud-sdk') {
      //   return
      // }

      // Handle relative and absolute paths
      if (this.isLocalModule(moduleName)) {
        const functionPath = this.resolveFunctionsModulePath(moduleName, filename)

        if (filename === '') {
          currentFileName = functionPath
        }

        // Check module cache
        if (!Config.DISABLE_MODULE_CACHE && this.moduleCache.has(functionPath)) {
          return this.moduleCache.get(functionPath)!
        }

        // Check circular dependencies
        if (this.hasCircularDependency(functionPath, fromModule)) {
          throw new Error(
            `Circular dependency detected: ${fromModule.join(' -> ')} -> ${functionPath}`,
          )
        }

        // Load and compile module
        const functionData = FunctionCache.get(functionPath)

        if (functionData) {
          const compiledModule = this.compile(functionPath, functionData.compiledCode, fromModule)

          // Cache module if enabled
          if (!Config.DISABLE_MODULE_CACHE) {
            this.moduleCache.set(functionPath, compiledModule)
          }

          return compiledModule
        } else {
          const localModuleRelativePath = this.resolveModulePathFromProjectRoot(
            moduleName,
            filename,
          )

          const devLocalModuleAbsolutePath = path.join(Config.PROJECT_ROOT, localModuleRelativePath)

          const prodLocalModuleAbsolutePath = path.join(
            `${Config.PROJECT_ROOT}/dist`,
            localModuleRelativePath,
          )

          systemLogger.warn(
            `#### Function ${moduleName} not found, try to load from local and node_modules`,
          )

          try {
            return require(prodLocalModuleAbsolutePath)
          } catch (error) {
            systemLogger.warn(
              `#### dist # Function ${prodLocalModuleAbsolutePath} not found in local dir,try found from node_modules. ##`,
            )
            systemLogger.error(`ERR#: ${error instanceof Error ? error.message : String(error)}`)
            systemLogger.error(`ERR#: ${error instanceof Error ? error.stack : String(error)}`)
          }

          try {
            return require(devLocalModuleAbsolutePath)
          } catch (error) {
            systemLogger.warn(
              `#### dev # Function ${devLocalModuleAbsolutePath} not found in local dir,try found from node_modules. ##`,
            )
            systemLogger.error(`ERR#: ${error instanceof Error ? error.message : String(error)}`)
            systemLogger.error(`ERR#: ${error instanceof Error ? error.stack : String(error)}`)
          }
        }
      }

      return require(moduleName)
    } catch (error) {
      console.log('####', currentFileName, moduleName, error)
      if (filename === '') {
        throw new Error(`#### Failed1111111 to require module ${currentFileName}: ${error}`)
      } else {
        throw new Error(`#### ${currentFileName} Failed to require module ${moduleName}: ${error}`)
      }
    }
  }

  /**
   * Clear the module cache
   */
  static clearCache(): void {
    this.moduleCache.clear()
  }

  /**
   * Get the module cache
   */
  static getCache(): Map<string, Module['exports']> {
    return this.moduleCache
  }

  /**
   * Check if module name is a local module
   */
  private static isLocalModule(moduleName: string): boolean {
    return (
      moduleName.startsWith('@/') || moduleName.startsWith('./') || moduleName.startsWith('../')
    )
  }

  /**
   * Resolve module path from module name
   * @param moduleName The name of the module being imported
   * @param currentFilename The filename of the current module
   * @returns The resolved filename of the imported module
   */
  private static resolveFunctionsModulePath(moduleName: string, filename: string): string {
    // root dir is functions root
    if (moduleName.startsWith('@/')) {
      return moduleName.replace('@/', '')
    }
    const dirname = '/'
    const filePath = path.join(path.dirname(dirname + filename), moduleName)
    return filePath.slice(dirname.length)
  }

  private static resolveModulePathFromProjectRoot(moduleName: string, filename: string): string {
    // root dir is project root
    const projectRoot = process.cwd()
    const functionsRoot = Config.WORKSPACE_PATH
    const functionPath = path.join(functionsRoot, filename)
    const functionDirname = path.dirname(functionPath)
    const modulePath = path.join(functionDirname, moduleName)
    return path.relative(projectRoot, modulePath)
  }

  /**
   * Check for circular dependencies
   */
  private static hasCircularDependency(moduleName: string, fromModules: string[]): boolean {
    return fromModules.includes(moduleName)
  }

  /**
   * Wrap code with require function and module exports
   */
  protected static wrap(code: string): string {
    // ensure 1 line to balance line offset of error stack
    return [
      `function require(name){__from_modules.push(__filename);return __require(name,__from_modules,__filename);}`,
      `${code}`,
      `\nmodule.exports;`,
    ].join(' ')
  }

  // private static wrap(code: string): string {
  //   return [
  //     'function require(name) {',
  //     '  __from_modules.push(__filename);',
  //     '  return __require(name, __from_modules, __filename);',
  //     '}',
  //     code,
  //     '\nmodule.exports;',
  //   ].join('\n')
  // }

  /**
   * Compile function code into a module
   */
  static compile(
    functionName: string,
    code: string,
    fromModules: string[],
    consoleInstance?: Console,
  ): Module['exports'] {
    try {
      const runningOptions = this.createRunningOptions(functionName)
      const scriptOptions = this.createScriptOptions(functionName)
      const sandbox = this.buildSandbox(functionName, fromModules, consoleInstance)
      const wrappedCode = this.wrap(code)

      const script = new vm.Script(wrappedCode, scriptOptions)
      // script.runInNewContext return the result of the very last statement executed in the script.
      return script.runInNewContext(sandbox, runningOptions)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`#### Failed to compile ${functionName}: ${errorMessage}`)
    }
  }

  /**
   * Create script compilation options
   */
  private static createScriptOptions(filename: string): ScriptOptions {
    return {
      filename,
      importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER,
    }
  }

  /**
   * Create script runtime options
   */
  private static createRunningOptions(filename: string): RunningScriptInNewContextOptions {
    return {
      filename,
      displayErrors: true,
      // timeout: 5000,
      breakOnSigint: true,
      contextName: `VM_Context_${filename}`,
      contextCodeGeneration: {
        strings: true,
        wasm: true,
      },
      // microtaskMode: 'afterEvaluate',
    }
  }

  /**
   * Build sandbox environment for VM context
   */
  private static buildSandbox(
    functionName: string,
    fromModules: string[],
    consoleInstance?: Console,
  ): Context & FunctionModuleGlobalContext {
    const _module: Module = {
      exports: {},
    }

    const fConsole = consoleInstance || new Console(functionName, Config)
    const __from_modules = [...fromModules]

    // TODO: 添加一些 utils，比如清楚缓存，重刷缓存
    const sandbox: Context & FunctionModuleGlobalContext = {
      __filename: functionName,
      module: _module,
      exports: _module.exports,
      console: fConsole,

      // hack for functions import
      __require: this.functionsImport.bind(this),

      RegExp: RegExp,
      Buffer: Buffer,
      Float32Array: Float32Array,

      setInterval: setInterval,
      clearInterval: clearInterval,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setImmediate: setImmediate,
      clearImmediate: clearImmediate,

      Promise: Promise,
      process: process,
      URL: URL,
      fetch: globalThis.fetch,
      global: null,
      __from_modules: __from_modules,
    }

    sandbox.global = sandbox
    return sandbox
  }
}
