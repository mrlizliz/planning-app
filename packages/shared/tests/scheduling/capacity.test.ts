// ============================================================
// T0-03 / T0-04 — Test funzioni di capacity e scheduling
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  calculateDailyCapacity,
  applyAllocation,
  calculateDurationDays,
  getMeetingMinutesForDay,
  isOverallocated,
  type DailyCapacityInput,
} from '../../src/scheduling/capacity.js'
import type { RecurringMeeting } from '../../src/types/calendar.js'

// ============================================================
// T0-03: Test delle regole di scheduling come funzioni pure
// ============================================================

describe('calculateDailyCapacity', () => {
  it('8h lavoro, 0 meeting, 0 overhead → 480 min netti', () => {
    const input: DailyCapacityInput = {
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 0,
      meetingMinutes: 0,
      absent: false,
      halfDayAbsent: false,
    }
    const result = calculateDailyCapacity(input)
    expect(result.netMinutes).toBe(480)
    expect(result.alert).toBe(false)
  })

  it('8h lavoro, 1h meeting, 30min overhead → 390 min netti (6.5h)', () => {
    const input: DailyCapacityInput = {
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 30,
      meetingMinutes: 60,
      absent: false,
      halfDayAbsent: false,
    }
    const result = calculateDailyCapacity(input)
    expect(result.netMinutes).toBe(390)
    expect(result.meetingMinutes).toBe(60)
    expect(result.overheadMinutes).toBe(30)
    expect(result.alert).toBe(false)
  })

  it('persona assente tutto il giorno → capacità 0, alert true', () => {
    const input: DailyCapacityInput = {
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 30,
      meetingMinutes: 60,
      absent: true,
      halfDayAbsent: false,
    }
    const result = calculateDailyCapacity(input)
    expect(result.netMinutes).toBe(0)
    expect(result.absenceMinutes).toBe(480)
    expect(result.alert).toBe(true)
  })

  it('persona assente mezza giornata → capacità dimezzata meno overhead', () => {
    const input: DailyCapacityInput = {
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 30,
      meetingMinutes: 0,
      absent: false,
      halfDayAbsent: true,
    }
    const result = calculateDailyCapacity(input)
    // grossMinutes rimane 480, ma il lavoro effettivo è 240 (metà)
    // netMinutes = 240 - 0 meeting - 30 overhead = 210
    expect(result.netMinutes).toBe(210)
    expect(result.absenceMinutes).toBe(240)
  })

  it('troppi meeting → capacità netta = 0, alert true', () => {
    const input: DailyCapacityInput = {
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 30,
      meetingMinutes: 480, // 8h di meeting!
      absent: false,
      halfDayAbsent: false,
    }
    const result = calculateDailyCapacity(input)
    expect(result.netMinutes).toBe(0)
    expect(result.alert).toBe(true)
  })

  it('part-time 4h, nessun meeting → 240 min netti', () => {
    const input: DailyCapacityInput = {
      dailyWorkingMinutes: 240,
      dailyOverheadMinutes: 0,
      meetingMinutes: 0,
      absent: false,
      halfDayAbsent: false,
    }
    const result = calculateDailyCapacity(input)
    expect(result.netMinutes).toBe(240)
  })
})

// ============================================================
// applyAllocation
// ============================================================

describe('applyAllocation', () => {
  it('480 min × 100% = 480', () => {
    expect(applyAllocation(480, 100)).toBe(480)
  })

  it('480 min × 50% = 240', () => {
    expect(applyAllocation(480, 50)).toBe(240)
  })

  it('480 min × 25% = 120', () => {
    expect(applyAllocation(480, 25)).toBe(120)
  })

  it('480 min × 33% = 158 (floor)', () => {
    // 480 * 0.33 = 158.4 → floor = 158
    expect(applyAllocation(480, 33)).toBe(158)
  })

  it('0% → 0', () => {
    expect(applyAllocation(480, 0)).toBe(0)
  })

  it('allocazione > 100 → clamped a 100', () => {
    expect(applyAllocation(480, 150)).toBe(480)
  })

  it('allocazione negativa → clamped a 0', () => {
    expect(applyAllocation(480, -10)).toBe(0)
  })
})

// ============================================================
// T0-04: Test calcolo duration = effort / (capacity × allocation%)
// ============================================================

describe('calculateDurationDays', () => {
  it('960 min (16h) / 480 min (8h) al 100% = 2 giorni', () => {
    expect(calculateDurationDays(960, 480, 100)).toBe(2)
  })

  it('960 min (16h) / 480 min (8h) al 50% = 4 giorni', () => {
    expect(calculateDurationDays(960, 480, 50)).toBe(4)
  })

  it('960 min (16h) / 480 min (8h) al 25% = 8 giorni', () => {
    expect(calculateDurationDays(960, 480, 25)).toBe(8)
  })

  it('480 min (8h) / 480 min al 100% = 1 giorno', () => {
    expect(calculateDurationDays(480, 480, 100)).toBe(1)
  })

  it('100 min / 480 min al 100% = 1 giorno (arrotondamento per eccesso)', () => {
    expect(calculateDurationDays(100, 480, 100)).toBe(1)
  })

  it('1000 min / 480 min al 100% = 3 giorni (ceil di 2.08)', () => {
    expect(calculateDurationDays(1000, 480, 100)).toBe(3)
  })

  it('estimate 0 → 0 giorni', () => {
    expect(calculateDurationDays(0, 480, 100)).toBe(0)
  })

  it('capacity 0 → Infinity', () => {
    expect(calculateDurationDays(960, 0, 100)).toBe(Infinity)
  })

  it('allocation 0% → Infinity', () => {
    expect(calculateDurationDays(960, 480, 0)).toBe(Infinity)
  })
})

// ============================================================
// getMeetingMinutesForDay
// ============================================================

describe('getMeetingMinutesForDay', () => {
  const meetings: RecurringMeeting[] = [
    {
      id: 'm1',
      userId: null,
      name: 'Daily standup',
      type: 'standup',
      durationMinutes: 15,
      frequency: 'daily',
      daysOfWeek: [],
    },
    {
      id: 'm2',
      userId: null,
      name: 'Refinement',
      type: 'refinement',
      durationMinutes: 60,
      frequency: 'weekly',
      daysOfWeek: [3], // mercoledì
    },
    {
      id: 'm3',
      userId: null,
      name: 'Retro',
      type: 'retrospective',
      durationMinutes: 60,
      frequency: 'biweekly',
      daysOfWeek: [5], // venerdì
    },
  ]

  it('lunedì → solo daily (15 min)', () => {
    expect(getMeetingMinutesForDay(1, meetings)).toBe(15) // lun
  })

  it('mercoledì → daily 15 + refinement 60 = 75 min', () => {
    expect(getMeetingMinutesForDay(3, meetings)).toBe(75) // mer
  })

  it('venerdì → daily 15 + retro biweekly 30 (media) = 45 min', () => {
    expect(getMeetingMinutesForDay(5, meetings)).toBe(45) // ven
  })

  it('sabato → 0 min (daily non conta)', () => {
    expect(getMeetingMinutesForDay(6, meetings)).toBe(0)
  })

  it('domenica → 0 min', () => {
    expect(getMeetingMinutesForDay(0, meetings)).toBe(0)
  })

  it('nessun meeting → 0', () => {
    expect(getMeetingMinutesForDay(1, [])).toBe(0)
  })
})

// ============================================================
// isOverallocated
// ============================================================

describe('isOverallocated', () => {
  it('assegnati 480 min, capacità 480 → non sovrallocato', () => {
    expect(isOverallocated(480, 480)).toBe(false)
  })

  it('assegnati 481 min, capacità 480 → sovrallocato', () => {
    expect(isOverallocated(481, 480)).toBe(true)
  })

  it('assegnati 960 min (2 ticket full), capacità 480 → sovrallocato', () => {
    expect(isOverallocated(960, 480)).toBe(true)
  })

  it('assegnati 0, capacità 480 → non sovrallocato', () => {
    expect(isOverallocated(0, 480)).toBe(false)
  })
})

