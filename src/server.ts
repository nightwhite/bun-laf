import type { Server } from 'http'

import cors from 'cors'
import type { Express, Response, NextFunction, Request } from 'express'
import express from 'express'
import xmlparser from 'express-xml-bodyparser'

import Config from './config/Config'
import { DatabaseAgent } from './db/db'
import { FunctionCache } from './engine/cache/FunctionCache'
import { router } from './handler/router'
import { WebSocketAgent } from './handler/ws'
import type { BunLafServerConfig } from './types/server'
import { GetClientIPFromRequest, parseToken, splitBearerToken } from './utils/common'
import { systemLogger } from './utils/logger'

declare module 'express' {
  export interface Request {
    user?: any
  }
}

export class BunLafServer {
  private app: Express
  private server!: Server

  constructor(private userConfig: BunLafServerConfig = {}) {
    Config.initialize(userConfig)
    this.app = express()
    this.setupMiddlewares()
    this.setupRoutes()
  }

  private setupMiddlewares() {
    this.app.use(
      cors({
        origin: true,
        methods: '*',
        exposedHeaders: '*',
        credentials: true,
        maxAge: 86400,
      }),
    )

    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      if (!req.headers['x-real-ip']) {
        const clientIP = GetClientIPFromRequest(req)
        if (clientIP) {
          req.headers['x-real-ip'] = clientIP
        }
      }
      next()
    })

    this.app.use(express.json({ limit: Config.REQUEST_LIMIT_SIZE }))

    this.app.use(
      express.urlencoded({
        limit: Config.REQUEST_LIMIT_SIZE,
        extended: true,
      }),
    )

    this.app.use(
      express.raw({
        limit: Config.REQUEST_LIMIT_SIZE,
      }),
    )

    this.app.use(xmlparser())

    /**
     * Parsing bearer token
     */
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      const token = splitBearerToken(req.headers['authorization'] ?? '')
      const auth = token ? parseToken(token) : null
      req['user'] = auth
      next()
    })
  }

  private setupRoutes() {
    this.app.use(router)
  }

  private setupErrorHandling() {
    process.on('unhandledRejection', (reason, promise) => {
      systemLogger.error(`Caught unhandledRejection:`, reason, promise)
    })

    process.on('uncaughtException', (err) => {
      systemLogger.error(`Caught uncaughtException:`, err)
    })

    process.on('SIGTERM', this.exit.bind(this))
    process.on('SIGINT', this.exit.bind(this))
  }

  private setupWebSocket() {
    this.server.on('upgrade', (req, socket, head) => {
      WebSocketAgent.server.handleUpgrade(req, socket, head, (client) => {
        WebSocketAgent.server.emit('connection', client, req)
      })
    })
  }

  private exit() {
    this.server.close()
    DatabaseAgent.accessor.close()
    systemLogger.info('Bun-Laf framework exited!')
    process.exit(0)
  }

  public async start() {
    await DatabaseAgent.initialize()
    FunctionCache.initialize()

    this.server = this.app.listen(Config.PORT, () =>
      systemLogger.info(`server listened on ${Config.PORT}, pid: ${process.pid}`),
    )

    this.setupWebSocket()
    this.setupErrorHandling()

    systemLogger.info('Bun-Laf framework started.')
  }
}

export default BunLafServer
