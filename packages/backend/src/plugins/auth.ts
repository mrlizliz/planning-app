// ============================================================
// Auth Plugin — JWT authentication + role-based access
// ============================================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

export interface AuthUser {
  id: string
  email: string
  role: 'pm' | 'dev' | 'qa'
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authorize: (...roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser
    user: AuthUser
  }
}

async function authPlugin(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET ?? 'planning-app-dev-secret-change-in-production'

  await app.register(jwt, { secret })

  // Decorator: verifica JWT
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Non autenticato', message: 'Token JWT mancante o non valido' })
    }
  })

  // Decorator: verifica ruoli
  app.decorate('authorize', (...roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
        const user = request.user as AuthUser
        if (roles.length > 0 && !roles.includes(user.role)) {
          reply.status(403).send({ error: 'Non autorizzato', message: `Ruolo richiesto: ${roles.join(' o ')}` })
        }
      } catch (err) {
        reply.status(401).send({ error: 'Non autenticato' })
      }
    }
  })

  // POST /api/auth/login — Login con email (genera JWT)
  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password?: string }

    if (!email) {
      return reply.status(400).send({ error: 'Email obbligatoria' })
    }

    // In dev: accetta qualsiasi utente esistente nello store senza password
    // In produzione: integrare con SSO/LDAP/OAuth2
    const { getStore } = await import('../store/index.js')
    const store = getStore()
    const user = Array.from(store.users.values()).find((u) => u.email === email)

    if (!user) {
      return reply.status(401).send({ error: 'Utente non trovato' })
    }

    // In dev mode: skip password check. In prod: controllare password hash
    if (process.env.NODE_ENV === 'production' && password !== process.env.ADMIN_PASSWORD) {
      return reply.status(401).send({ error: 'Credenziali non valide' })
    }

    const token = app.jwt.sign(
      { id: user.id, email: user.email, role: user.appRole } as AuthUser,
      { expiresIn: '24h' },
    )

    return { token, user: { id: user.id, displayName: user.displayName, email: user.email, role: user.appRole } }
  })

  // GET /api/auth/me — Profilo utente corrente
  app.get('/api/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    return request.user
  })
}

export default fp(authPlugin, { name: 'auth' })

