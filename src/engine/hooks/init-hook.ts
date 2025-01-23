import { INIT_FUNCTION_NAME } from '../../constants/function-name'
import { systemLogger } from '../../utils/logger.js'
import { FunctionCache } from '../cache/FunctionCache'
import { FunctionExecutor } from '../executor/FunctionExecutor'

/**
 * Init hook for `__init__` cloud function
 */
export class InitHook {
  static async invoke() {
    const func = FunctionCache.get(INIT_FUNCTION_NAME)
    if (!func) {
      return
    }
    const executor = new FunctionExecutor(func)
    const result = await executor.invoke(
      {
        method: 'INIT',
        __function_name: func.name,
      },
      false,
    )

    if (result.error) {
      return systemLogger.error(result.error)
    }

    systemLogger.info('__init__ hook invoked')
  }
}
