import app from './index.js'
import logger from './services/cloudLogger.js'

const PORT = Number(process.env.PORT || 5001)

app.listen(PORT, () => {
  logger.info('BiasLens AI backend started', {
    port: PORT,
    nodeEnv: process.env.NODE_ENV,
  })
  console.log(`BiasLens AI backend running on http://localhost:${PORT}`)
})
