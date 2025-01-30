import type { Request, Response } from 'express'

import Config from '../config/Config'
import { DEFAULT_FUNCTION_NAME, INTERCEPTOR_FUNCTION_NAME } from '../constants/function-name'
import { FunctionCache } from '../engine/cache/FunctionCache'
import { FunctionExecutor } from '../engine/executor/FunctionExecutor'
import { generateUUID } from '../utils/common'
import { Console } from '../utils/logger'

export async function handleInvokeFunction(
  req: Request,
  res: Response,
  funcName: string,
): Promise<void> {
  const ctx: FunctionContext = {
    __function_name: funcName,
    query: req.query,
    files: req.files,
    body: req.body,
    headers: req.headers,
    method: req.method,
    request: req,
    response: res,
    requestId: generateUUID(),
  }

  let useInterceptor = true
  if (!FunctionCache.get(INTERCEPTOR_FUNCTION_NAME)) {
    useInterceptor = false
  }
  await invokeFunction(ctx, useInterceptor)
  return
}

// invoke cloud function
async function invokeFunction(ctx: FunctionContext, useInterceptor: boolean): Promise<void> {
  const requestId = ctx.requestId

  const name = ctx.__function_name

  ctx.user = ctx.request?.user

  let func = FunctionCache.get(name!)

  if (!func) {
    func = FunctionCache.get(DEFAULT_FUNCTION_NAME)
    if (!func) {
      ctx.response!.status(404).send('Function Not Found')
      return
    }
  }

  const logger = new Console(func.name, new Config())
  try {
    // execute the func
    const executor = new FunctionExecutor(func)
    const result = await executor.invoke(ctx, useInterceptor)

    if (result.error) {
      logger.error(result.error)
      ctx.response!.status(500).send({
        error: 'Internal Server Error',
        requestId,
      })
      return
    }

    if (ctx.response!.writableEnded === false) {
      let data = result.data
      if (typeof result.data === 'number') {
        data = Number(result.data).toString()
      }
      ctx.response!.send(data)
      return
    }
  } catch (error) {
    logger.error(requestId, 'failed to invoke error', error)
    ctx.response!.status(500).send('Internal Server Error')
    return
  }
}
