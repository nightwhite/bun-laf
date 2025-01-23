import type { Request, Response } from 'express'
import type { WebSocket } from 'ws'
/**
 * function data structure
 */
export interface IFunctionData {
  name: string
  code: string
  compiledCode: string
}

/**
 * ctx passed to function
 */
declare global {
  interface FunctionContext {
    files?:
      | {
          [fieldname: string]: Express.Multer.File[]
        }
      | Express.Multer.File[]
      | undefined
    headers?: Request['headers']
    query?: Request['query']
    body?: Request['body']
    params?: Request['params']
    method?: Request['method']
    webSocket?: WebSocket
    request?: Request
    response?: Response
    __function_name?: string
    requestId?: string
    url?: string
  }
}

/**
 * Result object returned by the running function
 */
export interface FunctionResult {
  data?: unknown
  error?: Error
  time_usage: number
}
