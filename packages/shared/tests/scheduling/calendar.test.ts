// ============================================================
// T0-05 / T0-06 — Test funzioni calendario (working days)
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  isWorkingDay,
  getWorkingDaysCount,
  getWorkingDays,
  addWorkingDays,
  nextWorkingDay,
  type CalendarConfig,
} from '../../src/scheduling/calendar.js'

// Calendario vuoto (nessun festivo, nessuna eccezione)
const emptyConfig: CalendarConfig = { holidays: [], exceptions: [] }

// Calendario con festivo il 25 aprile 2026 (sabato) e il 1 maggio (venerdì)
// e il 2 giugno 2026 (martedì)
const italyConfig: CalendarConfig = {
  holidays: [
    '2026-04-25', // Liberazione (sabato nel 2026)
    '2026-05-01', // Festa del lavoro (venerdì nel 2026)
    '2026-06-02', // Festa della Repubblica (martedì)
    '2026-04-08', // Mercoledì — festivo infrasettimanale fittizio per test
  ],
  exceptions: [],
}

// Calendario con eccezione: sabato 11 aprile 2026 è lavorativo
const exceptionConfig: CalendarConfig = {
  holidays: ['2026-04-08'],
  exceptions: ['2026-04-11'], // sabato lavorativo
}

// ============================================================
// isWorkingDay
// ============================================================

describe('isWorkingDay', () => {
  // T0-05 parziale: weekend
  it('lunedì → lavorativo', () => {
    const monday = new Date(2026, 3, 6) // 6 aprile 2026 = lunedì
    expect(isWorkingDay(monday, emptyConfig)).toBe(true)
  })

  it('sabato → non lavorativo', () => {
    const saturday = new Date(2026, 3, 4) // 4 aprile 2026 = sabato
    expect(isWorkingDay(saturday, emptyConfig)).toBe(false)
  })

  it('domenica → non lavorativo', () => {
    const sunday = new Date(2026, 3, 5) // 5 aprile 2026 = domenica
    expect(isWorkingDay(sunday, emptyConfig)).toBe(false)
  })

  // T0-06: festivo infrasettimanale
  it('mercoledì festivo → non lavorativo', () => {
    const holiday = new Date(2026, 3, 8) // 8 aprile 2026 = mercoledì festivo
    expect(isWorkingDay(holiday, italyConfig)).toBe(false)
  })

  it('giovedì (giorno dopo festivo) → lavorativo', () => {
    const thursday = new Date(2026, 3, 9) // 9 aprile 2026 = giovedì
    expect(isWorkingDay(thursday, italyConfig)).toBe(true)
  })

  // Eccezione manuale: sabato lavorativo
  it('sabato con eccezione manuale → lavorativo', () => {
    const saturday = new Date(2026, 3, 11) // 11 aprile 2026 = sabato
    expect(isWorkingDay(saturday, exceptionConfig)).toBe(true)
  })

  // Eccezione ha precedenza su festivo
  it('giorno festivo ma con eccezione → lavorativo', () => {
    const bothConfig: CalendarConfig = {
      holidays: ['2026-04-11'],
      exceptions: ['2026-04-11'],
    }
    const day = new Date(2026, 3, 11)
    expect(isWorkingDay(day, bothConfig)).toBe(true)
  })
})

// ============================================================
// getWorkingDaysCount
// ============================================================

describe('getWorkingDaysCount', () => {
  it('lunedì → venerdì (stessa settimana) = 5 giorni', () => {
    const mon = new Date(2026, 3, 6)  // lunedì
    const fri = new Date(2026, 3, 10) // venerdì
    expect(getWorkingDaysCount(mon, fri, emptyConfig)).toBe(5)
  })

  it('lunedì → domenica = 5 giorni (weekend escluso)', () => {
    const mon = new Date(2026, 3, 6)
    const sun = new Date(2026, 3, 12)
    expect(getWorkingDaysCount(mon, sun, emptyConfig)).toBe(5)
  })

  it('2 settimane complete = 10 giorni lavorativi', () => {
    const mon1 = new Date(2026, 3, 6)  // lunedì settimana 1
    const fri2 = new Date(2026, 3, 17) // venerdì settimana 2
    expect(getWorkingDaysCount(mon1, fri2, emptyConfig)).toBe(10)
  })

  it('settimana con festivo mercoledì = 4 giorni', () => {
    const mon = new Date(2026, 3, 6)  // lunedì
    const fri = new Date(2026, 3, 10) // venerdì
    // 8 aprile = festivo
    expect(getWorkingDaysCount(mon, fri, italyConfig)).toBe(4)
  })

  it('start > end → 0 giorni', () => {
    const fri = new Date(2026, 3, 10)
    const mon = new Date(2026, 3, 6)
    expect(getWorkingDaysCount(fri, mon, emptyConfig)).toBe(0)
  })

  it('stesso giorno lavorativo = 1', () => {
    const mon = new Date(2026, 3, 6)
    expect(getWorkingDaysCount(mon, mon, emptyConfig)).toBe(1)
  })

  it('stesso giorno weekend = 0', () => {
    const sat = new Date(2026, 3, 4)
    expect(getWorkingDaysCount(sat, sat, emptyConfig)).toBe(0)
  })
})

// ============================================================
// getWorkingDays (lista date)
// ============================================================

describe('getWorkingDays', () => {
  it('restituisce solo i giorni lavorativi', () => {
    const mon = new Date(2026, 3, 6)
    const sun = new Date(2026, 3, 12)
    const days = getWorkingDays(mon, sun, emptyConfig)
    expect(days).toHaveLength(5)
    // Tutti devono essere lun-ven
    days.forEach((d) => {
      expect(d.getDay()).toBeGreaterThanOrEqual(1)
      expect(d.getDay()).toBeLessThanOrEqual(5)
    })
  })
})

// ============================================================
// T0-05: addWorkingDays — date realistiche
// ============================================================

describe('addWorkingDays', () => {
  it('T0-05: lunedì + 5 giorni lavorativi = venerdì stessa settimana', () => {
    const monday = new Date(2026, 3, 6) // 6 aprile 2026 = lunedì
    const result = addWorkingDays(monday, 5, emptyConfig)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(3) // aprile
    expect(result.getDate()).toBe(10) // venerdì 10 aprile
  })

  it('venerdì + 1 giorno lavorativo = venerdì stessa (conta sé stesso)', () => {
    // addWorkingDays(venerdì, 1) = venerdì (il giorno di inizio è il primo giorno)
    const friday = new Date(2026, 3, 10)
    const result = addWorkingDays(friday, 1, emptyConfig)
    expect(result.getDate()).toBe(10)
  })

  it('venerdì + 2 giorni lavorativi = lunedì successivo', () => {
    const friday = new Date(2026, 3, 10)
    const result = addWorkingDays(friday, 2, emptyConfig)
    expect(result.getDate()).toBe(13) // lunedì 13 aprile
  })

  it('lunedì + 10 giorni lavorativi = venerdì della settimana successiva', () => {
    const monday = new Date(2026, 3, 6)
    const result = addWorkingDays(monday, 10, emptyConfig)
    expect(result.getDate()).toBe(17) // venerdì 17 aprile
  })

  // T0-06: festivo infrasettimanale → giorno saltato
  it('T0-06: lunedì + 5gg con festivo mercoledì = lunedì successivo', () => {
    const monday = new Date(2026, 3, 6)
    // Settimana: lun6, mar7, [mer8=festivo], gio9, ven10
    // 5 giorni lavorativi: lun6, mar7, gio9, ven10, lun13
    const result = addWorkingDays(monday, 5, italyConfig)
    expect(result.getDate()).toBe(13) // lunedì 13 aprile
  })

  it('0 giorni lavorativi → stessa data', () => {
    const monday = new Date(2026, 3, 6)
    const result = addWorkingDays(monday, 0, emptyConfig)
    expect(result.getDate()).toBe(6)
  })

  it('inizio su sabato → salta al lunedì e conta da lì', () => {
    const saturday = new Date(2026, 3, 4)
    const result = addWorkingDays(saturday, 1, emptyConfig)
    expect(result.getDate()).toBe(6) // lunedì 6 aprile
  })

  it('sabato lavorativo (eccezione) + 1 = sabato stesso', () => {
    const saturday = new Date(2026, 3, 11)
    const result = addWorkingDays(saturday, 1, exceptionConfig)
    expect(result.getDate()).toBe(11) // sabato 11 = eccezione lavorativa
  })
})

// ============================================================
// nextWorkingDay
// ============================================================

describe('nextWorkingDay', () => {
  it('lunedì → lunedì (già lavorativo)', () => {
    const monday = new Date(2026, 3, 6)
    const result = nextWorkingDay(monday, emptyConfig)
    expect(result.getDate()).toBe(6)
  })

  it('sabato → lunedì', () => {
    const saturday = new Date(2026, 3, 4)
    const result = nextWorkingDay(saturday, emptyConfig)
    expect(result.getDate()).toBe(6)
  })

  it('domenica → lunedì', () => {
    const sunday = new Date(2026, 3, 5)
    const result = nextWorkingDay(sunday, emptyConfig)
    expect(result.getDate()).toBe(6)
  })

  it('festivo mercoledì → giovedì', () => {
    const wednesday = new Date(2026, 3, 8)
    const result = nextWorkingDay(wednesday, italyConfig)
    expect(result.getDate()).toBe(9) // giovedì
  })
})

