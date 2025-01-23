import type { Request } from 'express'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'

import { WEBSOCKET_FUNCTION_NAME } from '../constants/function-name'
import { FunctionModule } from '../engine/module/FunctionModule'
import { generateUUID } from '../utils/common'
import { systemLogger } from '../utils/logger'

export class WebSocketAgent {
  private static _server: WebSocketServer | null = null

  static get server(): WebSocketServer {
    if (!this._server) {
      this._server = new WebSocketServer({ noServer: true })
      this.server.on('connection', handleSocketConnection)
      this.server.on('error', (error) => systemLogger.error('websocket server got error:', error))
    }

    return this._server
  }

  static get clients() {
    return this.server.clients
  }
}

/**
 * Handle socket connection
 * @param socket
 * @param request
 */
function handleSocketConnection(socket: WebSocket, request: Request) {
  // handle connection event
  handleWebSocketEvent('WebSocket:connection', null, socket, request)

  // handle message event
  socket.on('message', (data, isBinary) => {
    const param = { data, isBinary }
    handleWebSocketEvent('WebSocket:message', param, socket)
  })

  // handle error event
  socket.on('error', (error) => {
    const param = error
    handleWebSocketEvent('WebSocket:error', param, socket)
  })

  // handle close event
  socket.on('close', (code, reason) => {
    const param = { code, reason }
    handleWebSocketEvent('WebSocket:close', param, socket)
  })
}

/**
 * Handle WebSocket Event
 * @param event
 * @param data
 * @param webSocket
 * @param request
 */
async function handleWebSocketEvent(
  event: string,
  data: unknown,
  webSocket: WebSocket,
  request?: Request,
) {
  const param: FunctionContext = {
    params: data as Request['params'],
    method: event,
    requestId: generateUUID(),
    webSocket,
    __function_name: WEBSOCKET_FUNCTION_NAME,
    request,
    url: request?.url,
    headers: request?.headers,
  }

  const module = FunctionModule.get(WEBSOCKET_FUNCTION_NAME)

  if (!module) {
    throw new Error(`FunctionExecutionError: Module '${WEBSOCKET_FUNCTION_NAME}' not found`)
  }

  const handler = module.default || module.main
  if (typeof handler === 'function') {
    await handler(param)
  } else {
    systemLogger.error(`default function not found in ${WEBSOCKET_FUNCTION_NAME}`)
  }
}
