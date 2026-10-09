import type { ISODate } from './date'
import { addDays, diffDays } from './date'

export interface DayEntry {
  done: boolean
  at?: number
  data: Record<string, any>
}

export interface Run {
  id: string
  challengeId: string
  start: ISODate
  days: DayEntry[]
  completedAt?: number
  abandonedAt?: number
}

export type RunStatus = 'upcoming' | 'active' | 'finishing' | 'completed' | 'missed' | 'abandoned'

export const WEEK = 7

export function newRun(challengeId: string, start: ISODate): Run {
  return {
    id: `${challengeId}-${start}-${Math.random().toString(36).slice(2, 7)}`,
    challengeId,
    start,
    days: Array.from({ length: WEEK }, () => ({ done: false, data: {} })),
  }
}

/** 0-based index of `day` inside the run, may be negative or ≥ 7. */
export function dayIndex(run: Run, day: ISODate): number {
  return diffDays(run.start, day)
}

export function dateOfDay(run: Run, idx: number): ISODate {
  return addDays(run.start, idx)
}

export function checkedCount(run: Run): number {
  return run.days.filter(d => d.done).length
}

export function allChecked(run: Run): boolean {
  return run.days.every(d => d.done)
}

/**
 * Status of a run on a given day.
 * - finishing: the 7 days are over (or all checked) but DONE has not been stamped yet.
 *   We keep one grace day after the week so late-night check-ins still count.
 */
export function runStatus(run: Run, day: ISODate): RunStatus {
  if (run.completedAt)
    return 'completed'
  if (run.abandonedAt)
    return 'abandoned'
  const idx = dayIndex(run, day)
  if (idx < 0)
    return 'upcoming'
  if (allChecked(run))
    return 'finishing'
  if (idx < WEEK)
    return 'active'
  if (idx === WEEK)
    return 'finishing'
  return 'missed'
}

export function isLive(run: Run, day: ISODate): boolean {
  const s = runStatus(run, day)
  return s === 'active' || s === 'finishing' || s === 'upcoming'
}

/** A day can be ticked when it is today or in the past of the run (forgot yesterday) — never the future. */
export function canEditDay(run: Run, idx: number, day: ISODate): boolean {
  if (run.completedAt || run.abandonedAt)
    return false
  return idx >= 0 && idx < WEEK && idx <= dayIndex(run, day)
}

export function setDay(run: Run, idx: number, done: boolean, data?: Record<string, any>): Run {
  const days = run.days.map((d, i) => i === idx
    ? { done, at: done ? Date.now() : undefined, data: { ...d.data, ...data } }
    : d)
  return { ...run, days }
}

export function patchDayData(run: Run, idx: number, data: Record<string, any>): Run {
  const days = run.days.map((d, i) => i === idx ? { ...d, data: { ...d.data, ...data } } : d)
  return { ...run, days }
}

export function completeRun(run: Run): Run {
  if (!allChecked(run))
    throw new Error('All seven days must be checked before DONE')
  return { ...run, completedAt: Date.now() }
}

/** Consecutive days (ending today or yesterday) where at least one challenge day was checked. */
export function streak(runs: Run[], day: ISODate): number {
  const checked = new Set<ISODate>()
  for (const r of runs) {
    r.days.forEach((d, i) => {
      if (d.done)
        checked.add(dateOfDay(r, i))
    })
  }
  let cursor = checked.has(day) ? day : addDays(day, -1)
  let n = 0
  while (checked.has(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}
