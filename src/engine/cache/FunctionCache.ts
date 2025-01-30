import fs from 'fs'
import path from 'path'

import type { FSWatcher } from 'chokidar'
import chokidar from 'chokidar'

import Config from '../../config/Config'
import type { IFunctionData } from '../../types/functions'
import { compileTs2js } from '../../utils/lang'
import { systemLogger } from '../../utils/logger'
import { InitHook } from '../hooks/init-hook'
import { FunctionModule } from '../module/FunctionModule'

/**
 * Manages caching of cloud functions in memory
 * Provides functionality to load, store, and manage function data
 */
export class FunctionCache {
  /** In-memory cache storing function data, indexed by function name */
  private static cache: Map<string, IFunctionData> = new Map()
  private static watcher: FSWatcher | null = null

  /**
   * Initializes the function cache by loading all functions from workspace
   * and triggers init hooks after completion
   */
  static initialize(): void {
    systemLogger.info('initialize function cache')

    this.initializeFromWorkspace()
    this.startWatching()

    systemLogger.info('Function cache initialized.')

    // invoke init function
    InitHook.invoke()
  }

  /**
   * Retrieves function data by name from cache
   * @param name The function name to lookup
   * @returns The function data associated with the name
   */
  static get(name: string): IFunctionData {
    return FunctionCache.cache.get(name)!
  }

  /**
   * Returns all cached function data as an array
   * @returns Array of all function data objects
   */
  static getAll(): IFunctionData[] {
    return Array.from(FunctionCache.cache.values())
  }

  /**
   * Returns the raw cache Map object
   * @returns The internal cache Map
   */
  static getCache(): Map<string, IFunctionData> {
    return FunctionCache.cache
  }

  /**
   * Removes all entries from the cache
   */
  static clear(): void {
    FunctionCache.cache.clear()
  }

  /**
   * Adds or updates a function in the cache
   * @param name The function name
   * @param data The function data to cache
   */
  static set(name: string, data: IFunctionData): void {
    FunctionCache.cache.set(name, data)
  }

  /**
   * Removes a function from the cache
   * @param name The function name to remove
   */
  static delete(name: string): void {
    FunctionCache.cache.delete(name)
  }

  /**
   * Checks if a function exists in the cache
   * @param name The function name to check
   * @returns True if the function exists in cache
   */
  static has(name: string): boolean {
    return FunctionCache.cache.has(name)
  }

  /**
   * Returns the number of functions in the cache
   * @returns The cache size
   */
  static size(): number {
    return FunctionCache.cache.size
  }

  /**
   * Recursively loads all TypeScript functions from the workspace directory
   * Compiles them to JavaScript and stores them in the cache
   * @private
   */
  private static initializeFromWorkspace(): void {
    const stack = [Config.WORKSPACE_PATH]

    while (stack.length > 0) {
      const currentDir = stack.pop()
      if (!currentDir) continue
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        if (entry.isDirectory()) {
          stack.push(fullPath)
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          // Read the TypeScript file content
          const fileContent = fs.readFileSync(fullPath, 'utf8')

          // Calculate relative path from WORKSPACE_PATH and remove .ts extension
          const relativePath = path.relative(Config.WORKSPACE_PATH, fullPath)
          const name = relativePath.replace(/\.ts$/, '')
          // Compile the TypeScript code to JavaScript
          const compiledCode = compileTs2js(fileContent, name)
          // Create the cloud function data object
          const cloudFunction: IFunctionData = {
            name,
            code: fileContent,
            compiledCode,
          }
          systemLogger.info(`Loaded function: ${cloudFunction.name}`)
          FunctionCache.cache.set(cloudFunction.name, cloudFunction)
        }
      }
    }
  }

  /**
   * Starts watching for file changes in the workspace
   * @private
   */
  private static startWatching(): void {
    // 只在开发模型下监听文件变化
    if (Config.isProd) return
    this.watcher = chokidar.watch(Config.WORKSPACE_PATH, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true, // 添加这个选项来忽略初始的 add 事件
    })

    this.watcher
      .on('add', (path) => this.handleFileChange('add', path))
      .on('change', (path) => this.handleFileChange('change', path))
      .on('unlink', (path) => this.handleFileChange('unlink', path))

    systemLogger.info('Started watching workspace for changes')
  }

  /**
   * Handles file changes in the workspace
   * @private
   */
  private static handleFileChange(event: 'add' | 'change' | 'unlink', filepath: string): void {
    systemLogger.info(`${event} event: ${filepath}`)

    if (filepath.endsWith('.d.ts')) return
    if (!filepath.endsWith('.ts')) return

    const relativePath = path.relative(Config.WORKSPACE_PATH, filepath)
    const name = relativePath.replace(/\.ts$/, '')

    if (event === 'unlink') {
      this.delete(name)
      // 清理模块缓存
      FunctionModule.clearCache()
      systemLogger.info(`Removed function: ${name}`)
      return
    }

    // Read and compile the changed file
    const fileContent = fs.readFileSync(filepath, 'utf8')
    const compiledCode = compileTs2js(fileContent, name)
    const cloudFunction: IFunctionData = {
      name,
      code: fileContent,
      compiledCode,
    }

    this.set(name, cloudFunction)
    // 清理模块缓存
    FunctionModule.clearCache()
    systemLogger.info(`${event === 'add' ? 'Added' : 'Updated'} function: ${name}`)
  }

  /**
   * Stops the file watcher
   */
  static stopWatching(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
      systemLogger.info('Stopped watching workspace')
    }
  }
}
