import type { AxiosStatic } from 'axios'
import request from 'axios'
import { getDb, type Db } from 'database-proxy'

import { DatabaseAgent } from '../db/db'
import { getToken, parseToken } from '../utils/common'

import type {
  CloudSdkInterface,
  GetTokenFunctionType,
  InvokeFunctionType,
  MongoDriverObject,
  ParseTokenFunctionType,
} from './cloud.interface'
import { FunctionModule } from 'src/engine/module/FunctionModule'

export class Cloud implements CloudSdkInterface {
  /**
   * This method should be overwrite
   * @returns
   */
  static create: () => CloudSdkInterface

  private _cloud: CloudSdkInterface | undefined

  private get cloud(): CloudSdkInterface {
    if (createCloudSdk && !Cloud.create) {
      Cloud.create = createCloudSdk
    }

    if (!this._cloud) {
      this._cloud = Cloud.create()
    }
    return this._cloud
  }

  /**
   * Sending an HTTP request is actually an Axios instance. You can refer to the Axios documentation directly.
   * @deprecated this is deprecated and will be removed in future, use the global `fetch()` directly @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
   * @see https://axios-http.com/docs/intro
   */
  fetch: AxiosStatic = request

  database(): Db {
    return getDb(DatabaseAgent.accessor)
  }

  invoke: InvokeFunctionType = (name: string, param?: any) => {
    return this.cloud.invoke(name, param)
  }

  getToken: GetTokenFunctionType = (param: any) => {
    return getToken(param)
  }

  parseToken: ParseTokenFunctionType = (token: string) => {
    return parseToken(token)
  }

  get shared(): Map<string, any> {
    return this.cloud.shared
  }

  get mongo(): MongoDriverObject {
    return this.cloud.mongo
  }
}

const _shared_preference = new Map<string, any>()

export function createCloudSdk() {
  const cloud: CloudSdkInterface = {
    database: () => getDb(DatabaseAgent.accessor),
    shared: _shared_preference,
    getToken: getToken,
    parseToken: parseToken,
    mongo: {
      client: DatabaseAgent.client as any,
      db: DatabaseAgent.db as any,
    },
    invoke: invokeInFunction,
  }
  return cloud
}

/**
 * The cloud function is invoked in the cloud function, which runs in the cloud function.
 *
 * @param name the name of cloud function to be invoked
 * @ctx ctx the invoke params
 * @returns
 */
async function invokeInFunction(name: string, ctx?: FunctionContext) {
  const mod = FunctionModule.get(name)
  const func = (mod?.default || mod?.main) as (ctx: FunctionContext) => Promise<any>

  if (!func) {
    throw new Error(`invoke() failed to get function: ${name}`)
  }

  ctx = ctx ?? {}
  ctx.__function_name = name

  ctx.requestId = ctx.requestId ?? 'invoke'

  ctx.method = ctx.method ?? 'call'

  return await func(ctx)
}