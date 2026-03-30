// ============================================================
// Prisma Client — Singleton per database PostgreSQL/SQLite
// ============================================================

import { PrismaClient } from '@prisma/client'

let _prisma: PrismaClient | null = null

/**
 * Restituisce il PrismaClient singleton.
 * Abilitato solo se DATABASE_URL è configurato.
 */
export function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  return _prisma
}

/**
 * Chiude la connessione al database.
 */
export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect()
    _prisma = null
  }
}

/**
 * Verifica se il database è abilitato (DATABASE_URL configurato e USE_DATABASE=true).
 */
export function isDatabaseEnabled(): boolean {
  return process.env.USE_DATABASE === 'true' && !!process.env.DATABASE_URL
}

