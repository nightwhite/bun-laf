import * as util from 'util'

// TODO: chalk 升级 到最新版本
import chalk from 'chalk'
import lodash from 'lodash'

import Config from '../config/Config.js'
import type { SimpleWebConfig } from '../types/simple-web-config.js'

const enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

type LogLevelValue = {
  readonly [K in LogLevel]: number
}

export class Console {
  protected readonly category: string
  protected readonly config: SimpleWebConfig

  private static readonly LogLevelValue: LogLevelValue = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  }

  constructor(category: string, config: SimpleWebConfig) {
    this.category = category
    this.config = config
  }

  protected _format(level: LogLevel, ...params: unknown[]): string {
    const time = chalk.gray(new Date().toISOString())
    let levelStr = lodash.padStart(level, 5, ' ')
    levelStr = level === LogLevel.INFO ? chalk.gray(levelStr) : this._colorize(level, levelStr)

    const fn = chalk.blueBright(`[${this.category}]`)

    let location = ''
    if (this._shouldDisplayLine(level)) {
      try {
        throw new Error()
      } catch (e) {
        if (e instanceof Error && e.stack) {
          try {
            if (e.stack.includes('Executor.invoke')) {
              const msgs = e.stack.includes('at DebugConsole._format')
                ? e.stack.split('\n')[4]?.split(':')
                : e.stack.split('\n')[3]?.split(':')
              const line = msgs?.[1] ?? '?'
              let loc = msgs?.[0]?.match(/at (.*?) \(/)?.[1] ?? ''
              loc = loc === 'default_1' ? 'MAIN' : loc
              location = chalk.gray(`(${loc}:${line})`)
            }
          } catch {
            // ignore stack parse error
          }
        }
      }
    }

    const content = params
      .map((param): string => {
        if (typeof param === 'string') return this._colorize(level, param)
        if (param !== null && typeof param === 'object') {
          return this._colorize(
            level,
            util.inspect(param, {
              depth: this.config.logDepth ?? 2,
              colors: true,
            }),
          )
        }
        return this._colorize(level, String(param))
      })
      .join(' ')

    return `${time} ${levelStr} ${fn}${location} ${content}`
  }

  debug(...params: unknown[]): void {
    if (!this._shouldLog(LogLevel.DEBUG)) return
    const data = this._format(LogLevel.DEBUG, ...params)
    console.debug(data)
  }

  info(...params: unknown[]): void {
    if (!this._shouldLog(LogLevel.INFO)) return
    const data = this._format(LogLevel.INFO, ...params)
    console.info(data)
  }

  log(...params: unknown[]): void {
    if (!this._shouldLog(LogLevel.INFO)) return
    const data = this._format(LogLevel.INFO, ...params)
    console.log(data)
  }

  warn(...params: unknown[]): void {
    if (!this._shouldLog(LogLevel.WARN)) return
    const data = this._format(LogLevel.WARN, ...params)
    console.warn(data)
  }

  error(...params: unknown[]): void {
    if (!this._shouldLog(LogLevel.ERROR)) return
    const data = this._format(LogLevel.ERROR, ...params)
    console.error(data)
  }

  protected _colorize(level: LogLevel, data: unknown): string {
    const strData = String(data)
    switch (level) {
      case LogLevel.DEBUG:
        return chalk.cyan(strData)
      case LogLevel.WARN:
        return chalk.yellow(strData)
      case LogLevel.ERROR:
        return chalk.red(strData)
      default:
        return strData
    }
  }

  protected _shouldLog(level: LogLevel): boolean {
    const configLevel = this.config.logLevel ?? LogLevel.DEBUG
    const configLevelValue = Console.LogLevelValue[configLevel as LogLevel] ?? 0
    return Console.LogLevelValue[level] >= configLevelValue
  }

  protected _shouldDisplayLine(level: LogLevel): boolean {
    const displayLevelValue: LogLevelValue = {
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
      [LogLevel.DEBUG]: 4,
    }
    const configLevel = this.config.displayLineLogLevel ?? LogLevel.ERROR
    const configLevelValue = displayLevelValue[configLevel as LogLevel] ?? 3
    return displayLevelValue[level] >= configLevelValue
  }
}

export class DebugConsole extends Console {
  private _logs: string[] = []

  constructor(category: string, config: SimpleWebConfig) {
    super(category, config)
  }

  protected override _format(level: LogLevel, ...params: unknown[]): string {
    const data = super._format(level, ...params)
    this._logs.push(data)
    return data
  }

  getLogs(): string {
    return JSON.stringify(this._logs)
  }
}

/**
 * The global logger instance
 */
export const systemLogger = new Console('#', Config)
