export interface Logger {
  info(message: string, meta?: unknown): void
  error(message: string, meta?: unknown): void
  warn(message: string, meta?: unknown): void
  debug(message: string, meta?: unknown): void
}

class WorkerLogger implements Logger {

  private safeStringify(meta?: unknown): string {
    if (!meta) return ''

    // ✨ Jika meta adalah Error, ekstrak otomatis agar terbaca di log!
    if (meta instanceof Error) {
      return ` ${JSON.stringify({ name: meta.name, message: meta.message })}`
    }

    try {
      return ` ${JSON.stringify(meta)}`
    } catch {
      return ' [unserializable meta]'
    }
  }

  private formatMessage(level: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString()
    const metaStr = this.safeStringify(meta)

    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`
  }

  info(message: string, meta?: unknown): void {
    console.log(this.formatMessage('info', message, meta))
  }

  error(message: string, meta?: unknown): void {
    console.error(this.formatMessage('error', message, meta))
  }

  warn(message: string, meta?: unknown): void {
    console.warn(this.formatMessage('warn', message, meta))
  }

  debug(message: string, meta?: unknown): void {
    console.debug(this.formatMessage('debug', message, meta))
  }
}

export const logger = new WorkerLogger()