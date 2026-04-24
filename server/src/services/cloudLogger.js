import dotenv from 'dotenv'

dotenv.config()

const resolveProjectId = () =>
  process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID || 'biaslens-ai-demo'

class CloudLogger {
  constructor() {
    this.projectId = resolveProjectId()
    this.logs = []
  }

  log(level, message, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      projectId: this.projectId,
    }

    this.logs.push(entry)

    // Keep only last 1000 entries in memory
    if (this.logs.length > 1000) {
      this.logs.shift()
    }

    // Console output for local development
    const color =
      level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[36m'
    console.log(
      `${color}[${level}]\x1b[0m ${message}`,
      Object.keys(metadata).length > 0 ? metadata : '',
    )
  }

  info(message, metadata) {
    this.log('INFO', message, metadata)
  }

  warn(message, metadata) {
    this.log('WARN', message, metadata)
  }

  error(message, metadata) {
    this.log('ERROR', message, metadata)
  }

  getLogs(limit = 100) {
    return this.logs.slice(-limit)
  }
}

const logger = new CloudLogger()

export default logger
