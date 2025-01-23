import type { AxiosStatic } from 'axios'
import request from 'axios'
import { getDb, type Db } from 'database-proxy'
import type { WebSocket } from 'ws'

import { DatabaseAgent } from '../db/db'
import { getToken, parseToken } from '../utils/common'

import type {
  CloudSdkInterface,
  GetTokenFunctionType,
  InvokeFunctionType,
  MongoDriverObject,
  ParseTokenFunctionType,
} from './cloud.interface'

export class Cloud implements CloudSdkInterface {
  /**
   * This method should be overwrite
   * @returns
   */
  static create: () => CloudSdkInterface

  private _cloud: CloudSdkInterface | undefined

  private get cloud(): CloudSdkInterface {
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

  /**
   * Invoke cloud function
   * @deprecated Just import the cloud function directly, and then call it
   */
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

  get sockets(): Set<WebSocket> {
    return this.cloud.sockets
  }

  get appid(): string {
    return this.cloud.appid
  }

  /**
   * @deprecated this is deprecated and will be removed in future, use `process.env` instead
   */
  get env() {
    return this.cloud.env
  }
}
