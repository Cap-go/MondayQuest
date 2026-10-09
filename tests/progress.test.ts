import { describe, expect, it } from 'vitest'
import { addDays, diffDays, isMonday, nextMonday } from '../src/lib/date'
import { allChecked, canEditDay, completeRun, newRun, runStatus, setDay, streak } from '../src/lib/progress'

describe('dates', () => {
  it('finds the next Monday', () => {
    expect(nextMonday('2026-10-09')).toBe('2026-10-12') // Friday -> Monday
    expect(nextMonday('2026-10-12')).toBe('2026-10-19') // Monday -> next Monday
    expect(isMonday('2026-10-12')).toBe(true)
  })

  it('counts days across DST', () => {
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2)
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })
})

describe('runs', () => {
  const start = '2026-10-12'

  it('moves from upcoming to active to missed', () => {
    const run = newRun('mq01', start)
    expect(runStatus(run, '2026-10-11')).toBe('upcoming')
    expect(runStatus(run, '2026-10-14')).toBe('active')
    expect(runStatus(run, '2026-10-19')).toBe('finishing') // one grace day
    expect(runStatus(run, '2026-10-20')).toBe('missed')
  })

  it('never lets you tick the future', () => {
    const run = newRun('mq01', start)
    expect(canEditDay(run, 0, '2026-10-12')).toBe(true)
    expect(canEditDay(run, 1, '2026-10-12')).toBe(false)
    expect(canEditDay(run, 0, '2026-10-14')).toBe(true) // forgot Monday
  })

  it('requires seven ticks before DONE', () => {
    let run = newRun('mq01', start)
    expect(() => completeRun(run)).toThrow()
    for (let i = 0; i < 7; i++)
      run = setDay(run, i, true)
    expect(allChecked(run)).toBe(true)
    expect(runStatus(completeRun(run), '2026-10-20')).toBe('completed')
  })

  it('computes the streak across runs', () => {
    let a = newRun('mq01', start)
    a = setDay(a, 0, true)
    a = setDay(a, 1, true)
    a = setDay(a, 2, true)
    expect(streak([a], '2026-10-14')).toBe(3)
    expect(streak([a], '2026-10-15')).toBe(3) // today not ticked yet keeps yesterday's streak
    expect(streak([a], '2026-10-17')).toBe(0)
  })
})
