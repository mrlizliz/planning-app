// ============================================================
// Dependency Graph — Topological sort, cycle detection, impact analysis
// ============================================================

import type { Dependency, DependencyType } from '../types/dependency.js'
import type { Ticket } from '../types/ticket.js'
import type { Assignment } from '../types/assignment.js'

// ---- Types ----

export interface DependencyEdge {
  fromTicketId: string
  toTicketId: string
  type: DependencyType
}

export interface CycleDetectionResult {
  hasCycle: boolean
  /** Ticket IDs che formano il ciclo (vuoto se non c'è ciclo) */
  cycle: string[]
}

export interface ImpactAnalysisResult {
  /** Ticket direttamente o indirettamente impattati a valle */
  impactedTicketIds: string[]
  /** Dettaglio: per ogni ticket impattato, la catena di dipendenze */
  chains: Array<{ ticketId: string; path: string[] }>
}

// ---- Graph building ----

/**
 * Costruisce una mappa di adiacenza dal set di dipendenze.
 * fromTicketId → lista di { toTicketId, type }
 */
export function buildAdjacencyList(
  dependencies: Dependency[],
): Map<string, DependencyEdge[]> {
  const adj = new Map<string, DependencyEdge[]>()

  for (const dep of dependencies) {
    // Le dipendenze 'parallel' non creano vincoli di ordinamento
    if (dep.type === 'parallel') continue

    const edges = adj.get(dep.fromTicketId) ?? []
    edges.push({
      fromTicketId: dep.fromTicketId,
      toTicketId: dep.toTicketId,
      type: dep.type,
    })
    adj.set(dep.fromTicketId, edges)
  }

  return adj
}

/**
 * Genera le dipendenze implicite DEV → QA per lo stesso ticket.
 * Se un ticket ha un assignment DEV e un assignment QA, QA deve iniziare dopo DEV.
 */
export function getImplicitDevQaDependencies(
  assignments: Assignment[],
): DependencyEdge[] {
  // Raggruppa per ticketId
  const byTicket = new Map<string, Assignment[]>()
  for (const a of assignments) {
    const list = byTicket.get(a.ticketId) ?? []
    list.push(a)
    byTicket.set(a.ticketId, list)
  }

  const implicit: DependencyEdge[] = []
  for (const [ticketId, ticketAssignments] of byTicket) {
    const hasDev = ticketAssignments.some((a) => a.role === 'dev')
    const hasQa = ticketAssignments.some((a) => a.role === 'qa')
    if (hasDev && hasQa) {
      // DEV → QA implicito (stesso ticket)
      implicit.push({
        fromTicketId: ticketId,
        toTicketId: ticketId,
        type: 'finish_to_start',
      })
    }
  }

  return implicit
}

// ---- Cycle detection ----

/**
 * Rileva cicli nel grafo delle dipendenze usando DFS.
 * Restituisce il primo ciclo trovato (se presente).
 */
export function detectCycles(dependencies: Dependency[]): CycleDetectionResult {
  const adj = new Map<string, string[]>()

  // Costruisci grafo diretto (escludi parallel)
  for (const dep of dependencies) {
    if (dep.type === 'parallel') continue
    const neighbors = adj.get(dep.fromTicketId) ?? []
    neighbors.push(dep.toTicketId)
    adj.set(dep.fromTicketId, neighbors)
  }

  // Raccogli tutti i nodi
  const allNodes = new Set<string>()
  for (const dep of dependencies) {
    allNodes.add(dep.fromTicketId)
    allNodes.add(dep.toTicketId)
  }

  // DFS per ciclo
  const WHITE = 0 // non visitato
  const GRAY = 1  // in corso (nello stack corrente)
  const BLACK = 2 // completato

  const color = new Map<string, number>()
  const parent = new Map<string, string | null>()

  for (const node of allNodes) {
    color.set(node, WHITE)
    parent.set(node, null)
  }

  function dfs(u: string, path: string[]): string[] | null {
    color.set(u, GRAY)
    path.push(u)

    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === GRAY) {
        // Trovato un ciclo: estrai la porzione dal nodo ripetuto
        const cycleStart = path.indexOf(v)
        return [...path.slice(cycleStart), v]
      }
      if (color.get(v) === WHITE) {
        const cycle = dfs(v, path)
        if (cycle) return cycle
      }
    }

    path.pop()
    color.set(u, BLACK)
    return null
  }

  for (const node of allNodes) {
    if (color.get(node) === WHITE) {
      const cycle = dfs(node, [])
      if (cycle) {
        return { hasCycle: true, cycle }
      }
    }
  }

  return { hasCycle: false, cycle: [] }
}

// ---- Topological sort ----

/**
 * Ordina i ticket in ordine topologico (rispetta le dipendenze).
 * I ticket senza dipendenze vengono ordinati per priorità.
 *
 * Kahn's algorithm (BFS-based).
 *
 * @returns Array di ticketId in ordine di scheduling, oppure null se c'è un ciclo
 */
export function topologicalSort(
  ticketIds: string[],
  dependencies: Dependency[],
): string[] | null {
  // Costruisci grafo e calcola in-degree
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  // Inizializza tutti i ticket
  for (const id of ticketIds) {
    adj.set(id, [])
    inDegree.set(id, 0)
  }

  // Aggiungi edge (escludi parallel — non sono vincoli di ordinamento)
  for (const dep of dependencies) {
    if (dep.type === 'parallel') continue
    // Solo se entrambi i ticket esistono nel set
    if (!inDegree.has(dep.fromTicketId) || !inDegree.has(dep.toTicketId)) continue
    // Ignora self-loop (DEV→QA nello stesso ticket — gestito separatamente)
    if (dep.fromTicketId === dep.toTicketId) continue

    adj.get(dep.fromTicketId)!.push(dep.toTicketId)
    inDegree.set(dep.toTicketId, (inDegree.get(dep.toTicketId) ?? 0) + 1)
  }

  // Kahn's: nodi con in-degree 0
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: string[] = []

  while (queue.length > 0) {
    // Prendi il primo dalla coda
    const node = queue.shift()!
    sorted.push(node)

    for (const neighbor of adj.get(node) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  // Se non tutti i nodi sono stati processati → c'è un ciclo
  if (sorted.length !== ticketIds.length) return null

  return sorted
}

// ---- Impact analysis ----

/**
 * Dato un ticket, trova tutti i ticket a valle (direttamente o transitivamente dipendenti).
 * Usato per mostrare l'impatto di uno spostamento.
 */
export function getImpactedTickets(
  ticketId: string,
  dependencies: Dependency[],
): ImpactAnalysisResult {
  const adj = new Map<string, string[]>()

  for (const dep of dependencies) {
    if (dep.type === 'parallel') continue
    const neighbors = adj.get(dep.fromTicketId) ?? []
    neighbors.push(dep.toTicketId)
    adj.set(dep.fromTicketId, neighbors)
  }

  const impacted = new Set<string>()
  const chains: ImpactAnalysisResult['chains'] = []

  function dfs(current: string, path: string[]) {
    for (const next of adj.get(current) ?? []) {
      if (next === ticketId) continue // evita self-loop
      if (impacted.has(next)) continue // già visitato
      impacted.add(next)
      const newPath = [...path, next]
      chains.push({ ticketId: next, path: newPath })
      dfs(next, newPath)
    }
  }

  dfs(ticketId, [ticketId])

  return {
    impactedTicketIds: Array.from(impacted),
    chains,
  }
}

/**
 * Trova i predecessori diretti di un ticket (ticket che devono finire prima).
 */
export function getPredecessors(
  ticketId: string,
  dependencies: Dependency[],
): string[] {
  return dependencies
    .filter(
      (d) =>
        d.toTicketId === ticketId &&
        d.type !== 'parallel',
    )
    .map((d) => d.fromTicketId)
}

/**
 * Trova i successori diretti di un ticket.
 */
export function getSuccessors(
  ticketId: string,
  dependencies: Dependency[],
): string[] {
  return dependencies
    .filter(
      (d) =>
        d.fromTicketId === ticketId &&
        d.type !== 'parallel',
    )
    .map((d) => d.toTicketId)
}

