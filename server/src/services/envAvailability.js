import fs from 'fs'
import os from 'os'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const readEnv = (key) => (process.env[key] || '').trim()

const resolveProjectId = () => readEnv('GOOGLE_PROJECT_ID') || readEnv('GCP_PROJECT_ID')

const resolveCredentialsPath = () => readEnv('GOOGLE_APPLICATION_CREDENTIALS')

const resolveDefaultAdcPath = () => path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json')

const hasReadableCredentialsFile = () => {
  const credentialsPath = resolveCredentialsPath()
  if (!credentialsPath) {
    return false
  }

  try {
    return fs.existsSync(credentialsPath)
  } catch {
    return false
  }
}

const hasApplicationDefaultCredentials = () => {
  const defaultAdcPath = resolveDefaultAdcPath()

  try {
    return fs.existsSync(defaultAdcPath)
  } catch {
    return false
  }
}

export const getBigQueryStatus = () => {
  const projectId = resolveProjectId()
  const hasProjectId = Boolean(projectId)
  const hasServiceAccountFile = hasReadableCredentialsFile()
  const hasAdc = hasApplicationDefaultCredentials()
  const available = hasProjectId && (hasServiceAccountFile || hasAdc)

  let setupHint = 'BigQuery is ready.'
  if (!hasProjectId) {
    setupHint = 'Set GOOGLE_PROJECT_ID (or GCP_PROJECT_ID) to enable cloud analysis.'
  } else if (!hasServiceAccountFile && !hasAdc) {
    setupHint = 'Provide GOOGLE_APPLICATION_CREDENTIALS or install gcloud CLI and run gcloud auth application-default login.'
  }

  return {
    available,
    projectIdConfigured: hasProjectId,
    credentialsSource: hasServiceAccountFile ? 'service-account-file' : hasAdc ? 'adc' : 'none',
    credentialsPathConfigured: Boolean(resolveCredentialsPath()),
    setupHint,
  }
}

export const getEnvStatus = () => {
  const geminiAvailable = isGeminiAvailable()
  const bigQueryStatus = getBigQueryStatus()

  return {
    geminiAvailable,
    bigQueryAvailable: bigQueryStatus.available,
    bigQueryStatus,
    demoMode: !(geminiAvailable && bigQueryStatus.available),
  }
}

export function isGeminiAvailable() {
  return Boolean(readEnv('GEMINI_API_KEY'))
}

export function isBigQueryAvailable() {
  return getBigQueryStatus().available
}

export function getGoogleProjectId() {
  return resolveProjectId()
}

export function getGoogleCredentialsPath() {
  return resolveCredentialsPath()
}

export function getGeminiApiKey() {
  return readEnv('GEMINI_API_KEY')
}
