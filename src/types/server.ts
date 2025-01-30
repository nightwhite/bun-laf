export interface BunLafServerConfig {
  port?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  displayLineLogLevel?: 'debug' | 'info' | 'warn' | 'error'
  logDepth?: number
  requestLimitSize?: string
  disableModuleCache?: boolean
  workspacePath?: string
}
