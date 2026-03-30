// ============================================================
// @planning/backend — Fastify Server
// ============================================================

import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'node:path'

// Carica .env dalla root del monorepo
dotenvConfig({ path: resolve(process.cwd(), '.env') })
dotenvConfig({ path: resolve(process.cwd(), '..', '..', '.env') })

import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
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
import authPlugin from './plugins/auth.js'

export async function buildApp(options: { logger?: boolean; persist?: boolean } = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  })

  // Plugins
  await app.register(cors, {
    origin: true,
  })

  // Auth (JWT) — registra route /api/auth/login e /api/auth/me
  await app.register(authPlugin)

  // OpenAPI / Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Planning App API',
        description: 'API per capacity planning — Jira integration, scheduling, reporting',
        version: '0.1.0',
      },
      servers: [{ url: 'http://localhost:3001' }],
      tags: [
        { name: 'tickets', description: 'CRUD ticket + Jira sync' },
        { name: 'users', description: 'CRUD utenti' },
        { name: 'assignments', description: 'CRUD assignment' },
        { name: 'calendar', description: 'Festivi, eccezioni, assenze, meeting' },
        { name: 'scheduler', description: 'Auto-scheduling engine' },
        { name: 'capacity', description: 'Breakdown capacità giornaliera' },
        { name: 'releases', description: 'Milestone, release, deploy' },
        { name: 'dependencies', description: 'Dipendenze tra ticket' },
        { name: 'scenarios', description: 'Scenari what-if, forecast, KPI, report' },
        { name: 'auth', description: 'Autenticazione JWT' },
      ],
    },
  })
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
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

