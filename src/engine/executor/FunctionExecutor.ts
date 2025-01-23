import assert from 'assert'

import { INTERCEPTOR_FUNCTION_NAME } from '../../constants/function-name'
import type { FunctionResult, IFunctionData } from '../../types/functions'
import { nanosecond2ms } from '../../utils/common'
import { FunctionModule } from '../module/FunctionModule'

export class FunctionExecutor {
  /**
   * cloud function data struct
   */
  protected data: IFunctionData
  constructor(data: IFunctionData) {
    assert(data, 'function data cannot be empty')
    this.data = data
  }

  async invoke(context: FunctionContext, useInterceptor: boolean): Promise<FunctionResult> {
    const startTime = process.hrtime.bigint()

    try {
      const mod = this.getModule()
      const main = mod.default || mod.main

      // TODO: add HTTP method support
      // reject while no HTTP enabled
      // if (!func.methods.includes(ctx.request.method.toUpperCase())) {
      //   return ctx.response.status(405).send('Method Not Allowed')
      // }

      if (!main) {
        throw new Error('FunctionExecutionError: `main` function not found')
      }

      if (typeof main !== 'function') {
        throw new Error('FunctionExecutionError: `main` function must be callable')
      }

      let data = null

      switch (true) {
        case this.data.name === INTERCEPTOR_FUNCTION_NAME:
          data = await main(context, () => {})
          break

        case useInterceptor:
          data = await this.invokeWithInterceptor(
            context,
            (ctx: FunctionContext) => main(ctx) as Promise<unknown>,
          )
          break

        default:
          data = await main(context)
      }

      const endTime = process.hrtime.bigint()
      const timeUsage = nanosecond2ms(endTime - startTime)
      return {
        data,
        time_usage: timeUsage,
      }
    } catch (error) {
      const endTime = process.hrtime.bigint()
      const timeUsage = nanosecond2ms(endTime - startTime)

      return {
        error: error instanceof Error ? error : new Error(String(error)),
        time_usage: timeUsage,
      }
    }
  }

  protected async invokeWithInterceptor(
    context: FunctionContext,
    next?: (context: FunctionContext) => Promise<unknown>,
  ) {
    const mod = FunctionModule.get(INTERCEPTOR_FUNCTION_NAME)
    if (!mod) {
      throw new Error(`FunctionExecutionError: Module '${INTERCEPTOR_FUNCTION_NAME}' not found`)
    }
    const interceptor = mod.default || mod.main

    if (!interceptor) {
      throw new Error(
        `FunctionExecutionError: main function '${INTERCEPTOR_FUNCTION_NAME}' not found`,
      )
    }

    if (typeof interceptor !== 'function') {
      throw new Error(
        `FunctionExecutionError: Function '${INTERCEPTOR_FUNCTION_NAME}' must be callable`,
      )
    }

    // interceptor must have 2 arguments one is context and the other is next function
    if (interceptor.length !== 2) {
      throw new Error(
        `FunctionExecutionError: Function '${INTERCEPTOR_FUNCTION_NAME}' must have 2 arguments`,
      )
    }

    return await interceptor(context, next)
  }

  protected getModule() {
    const mod = FunctionModule.get(this.data.name)
    if (!mod) {
      throw new Error(`FunctionExecutionError: Module '${this.data.name}' not found`)
    }
    return mod
  }
}
