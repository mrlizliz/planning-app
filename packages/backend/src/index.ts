// ============================================================
// @planning/backend — Fastify Server
// ============================================================

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { ticketRoutes } from './routes/tickets.js'
import { userRoutes } from './routes/users.js'
import { assignmentRoutes } from './routes/assignments.js'
import { calendarRoutes } from './routes/calendar.js'
import { schedulerRoutes } from './routes/scheduler.js'
import { capacityRoutes } from './routes/capacity.js'
import { releaseRoutes } from './routes/releases.js'
import { dependencyRoutes } from './routes/dependencies.js'
import { scenarioRoutes } from './routes/scenarios.js'
import { saveToDisk } from './store/index.js'

export async function buildApp(options: { logger?: boolean; persist?: boolean } = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  })

  // Plugins
  await app.register(cors, {
    origin: true,
  })

  // Auto-save: dopo ogni risposta di scrittura riuscita, salva lo store su disco
  if (options.persist !== false) {
    app.addHook('onResponse', async (request, reply) => {
      const method = request.method
      if ((method === 'POST' || method === 'PUT' || method === 'DELETE') && reply.statusCode < 400) {
        saveToDisk()
      }
    })
  }

  // Routes
  await app.register(ticketRoutes)
  await app.register(userRoutes)
  await app.register(assignmentRoutes)
  await app.register(calendarRoutes)
  await app.register(schedulerRoutes)
  await app.register(capacityRoutes)
  await app.register(releaseRoutes)
  await app.register(dependencyRoutes)
  await app.register(scenarioRoutes)

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  return app
}

// Avvio solo se eseguito direttamente (non in test)
const isMainModule = process.argv[1]?.includes('index')
if (isMainModule) {
  const port = parseInt(process.env.PORT ?? '3001', 10)
  const host = process.env.HOST ?? '0.0.0.0'

  const app = await buildApp()
  try {
    await app.listen({ port, host })
    console.log(`🚀 Planning API running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

