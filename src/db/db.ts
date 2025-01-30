import { MongoAccessor } from 'database-proxy'
import { MongoClient } from 'mongodb'

import Config from '../config/Config'
import { systemLogger } from '../utils/logger'

/**
 * Database Management
 */
export class DatabaseAgent {
  private static _accessor: MongoAccessor
  private static _client: MongoClient

  /**
   * Mongo client
   */
  static get client() {
    return this._client
  }

  /**
   * Database instance
   */
  static get db() {
    return this.client.db()
  }

  static async initialize() {
    console.log('DB_URI:', Config.DB_URI)
    if (Config.DB_URI === null) {
      systemLogger.error('DB_URI is not set')
      return
    }
    const client = new MongoClient(Config.DB_URI)

    let retryDelay = 1000 // 1s
    const maxDelay = 30 * 1000 // 30s
    while (true) {
      try {
        this._client = await client.connect()
        systemLogger.info('db connected')
        return this._client
      } catch (error) {
        systemLogger.error('connect db failed:', error)

        if (retryDelay > maxDelay) {
          retryDelay = 1000
          systemLogger.warn('connect db failed, try again...')
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay))
        retryDelay *= 2
      }
    }
  }

  /**
   * MongoAccessor instance of database-proxy
   */
  static get accessor() {
    if (!this._accessor) {
      this._accessor = new MongoAccessor(this.client)
      this._accessor.logger.level = 0
    }
    return this._accessor
  }
}
