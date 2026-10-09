export type ISODate = string // YYYY-MM-DD in local time

export function toISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function today(now = new Date()): ISODate {
  return toISO(now)
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Whole days from a to b (b - a), DST safe. */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))
  return Math.round(ms / 86_400_000)
}

function ymd(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return [y!, m! - 1, d!]
}

export function isMonday(iso: ISODate): boolean {
  return fromISO(iso).getDay() === 1
}

export function nextMonday(iso: ISODate): ISODate {
  const dow = fromISO(iso).getDay() // 0 sun … 6 sat
  const delta = ((8 - dow) % 7) || 7
  return addDays(iso, delta)
}

export function formatDate(iso: ISODate, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }): string {
  return new Intl.DateTimeFormat(locale, opts).format(fromISO(iso))
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatHM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
