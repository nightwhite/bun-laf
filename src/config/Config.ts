import fs from 'fs'
import path from 'path'

import dotenv from 'dotenv'

import type { BunLafServerConfig } from '../types/server'

dotenv.config()

/**
 * config manager
 */
// export default class Config {
//   private static config: BunLafServerConfig = {}

//   static initialize(userConfig: BunLafServerConfig = {}) {
//     this.config = {
//       port: userConfig.port || Number(process.env.PORT) || 2342,
//       logLevel:
//         userConfig.logLevel ||
//         (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
//         'debug',
//       displayLineLogLevel:
//         userConfig.displayLineLogLevel ||
//         (process.env.DISPLAY_LINE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
//         'error',
//       logDepth:
//         userConfig.logDepth !== undefined
//           ? Math.min(Math.max(userConfig.logDepth, 0), 5)
//           : Number(process.env.LOG_DEPTH) || 1,
//       requestLimitSize: userConfig.requestLimitSize || process.env.REQUEST_LIMIT_SIZE || '10mb',
//       disableModuleCache:
//         userConfig.disableModuleCache !== undefined
//           ? userConfig.disableModuleCache
//           : process.env.DISABLE_MODULE_CACHE === 'true',
//       isProd:
//         userConfig.isProd !== undefined ? userConfig.isProd : process.env.NODE_ENV === 'production',
//     }
//   }

//   static get PORT(): number {
//     return this.config.port!
//   }

//   static get LOG_LEVEL(): 'debug' | 'info' | 'warn' | 'error' {
//     return this.config.logLevel!
//   }

//   static get DISPLAY_LINE_LOG_LEVEL(): 'debug' | 'info' | 'warn' | 'error' {
//     return this.config.displayLineLogLevel!
//   }

//   static get LOG_DEPTH(): number {
//     return this.config.logDepth!
//   }

//   static get REQUEST_LIMIT_SIZE(): string {
//     return this.config.requestLimitSize!
//   }

//   static get DISABLE_MODULE_CACHE(): boolean {
//     return this.config.disableModuleCache!
//   }

//   static get isProd(): boolean {
//     return this.config.isProd!
//   }
// }

/**
 * config manager
 */
export class Config {
  private static config: BunLafServerConfig = {}
  private static userProjectRoot: string = process.cwd()

  /**
   * Initialize configuration
   * Priority: userConfig > environment variables > default values
   */
  static initialize(userConfig: BunLafServerConfig = {}) {
    try {
      this.config = {
        port: userConfig.port || Number(process.env.PORT) || 2342,
        logLevel:
          userConfig.logLevel ||
          (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
          'debug',
        displayLineLogLevel:
          userConfig.displayLineLogLevel ||
          (process.env.DISPLAY_LINE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
          'error',
        logDepth:
          userConfig.logDepth !== undefined
            ? Math.min(Math.max(userConfig.logDepth, 0), 5)
            : Number(process.env.LOG_DEPTH) || 1,
        requestLimitSize: userConfig.requestLimitSize || process.env.REQUEST_LIMIT_SIZE || '10mb',
        disableModuleCache:
          userConfig.disableModuleCache !== undefined
            ? userConfig.disableModuleCache
            : process.env.DISABLE_MODULE_CACHE === 'true',
        workspacePath: this.resolveWorkspacePath(userConfig.workspacePath),
      }

      if (process.env.DEBUG) {
        console.info('User Project Root:', this.userProjectRoot)
        console.info('Config initialized:', this.config)
      }
    } catch (error) {
      throw new Error(`Failed to initialize config: ${(error as Error).message}`)
    }
  }

  /**
   * Resolves the workspace path for functions
   * Priority:
   * 1. User configured path (absolute or relative)
   * 2. WORKSPACE_PATH environment variable
   * 3. Default 'functions' directory in user project root
   */
  private static resolveWorkspacePath(configPath: string | undefined): string {
    try {
      // 1. 用户配置的路径
      if (configPath) {
        const resolvedPath = path.isAbsolute(configPath)
          ? configPath
          : path.join(this.userProjectRoot, configPath)
        this.ensureDirectoryExists(resolvedPath)
        return resolvedPath
      }

      // 2. 环境变量中的路径
      if (process.env.WORKSPACE_PATH) {
        const resolvedPath = path.isAbsolute(process.env.WORKSPACE_PATH)
          ? process.env.WORKSPACE_PATH
          : path.join(this.userProjectRoot, process.env.WORKSPACE_PATH)
        this.ensureDirectoryExists(resolvedPath)
        return resolvedPath
      }

      // 3. 默认路径：用户项目下的 functions 目录
      const defaultPath = path.join(this.userProjectRoot, 'functions')
      this.ensureDirectoryExists(defaultPath)
      return defaultPath
    } catch (error) {
      throw new Error(`Failed to resolve workspace path: ${(error as Error).message}`)
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private static ensureDirectoryExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
        if (process.env.DEBUG) {
          console.info(`Created directory: ${dirPath}`)
        }
      }
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${(error as Error).message}`)
    }
  }

  /**
   * mongodb connection configuration
   */
  static get DB_URI() {
    return process.env['DB_URI'] || null
  }

  /**
   * the server secret salt, mainly used for generating tokens
   */
  static get SERVER_SECRET(): string {
    const secret_salt = process.env['SERVER_SECRET']
    if (!secret_salt) {
      throw new Error('env: `SERVER_SECRET` is missing')
    }
    return secret_salt
  }

  static get PORT(): number {
    return this.config.port!
  }

  static get LOG_LEVEL(): 'debug' | 'info' | 'warn' | 'error' {
    return this.config.logLevel!
  }

  static get DISPLAY_LINE_LOG_LEVEL(): 'debug' | 'info' | 'warn' | 'error' {
    return this.config.displayLineLogLevel!
  }

  static get LOG_DEPTH(): number {
    return this.config.logDepth!
  }

  static get REQUEST_LIMIT_SIZE(): string {
    return this.config.requestLimitSize!
  }

  static get DISABLE_MODULE_CACHE(): boolean {
    return this.config.disableModuleCache!
  }

  static get isProd(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  static get WORKSPACE_PATH(): string {
    return this.config.workspacePath!
  }

  static get PROJECT_ROOT(): string {
    return this.userProjectRoot
  }
}

export default Config
