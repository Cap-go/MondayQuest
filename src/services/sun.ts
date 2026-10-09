import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import * as SunCalc from 'suncalc'
import { formatHM } from '~/lib/date'

// Sunrise for the Rising sun challenge, computed on the device from a coarse position and the date.
// The position is rounded (~1 km) and never leaves the phone.

export interface Coords { lat: number, lon: number, at: number, approx?: boolean }

const KEY = 'mq.coords'
/** Wake-up target: this many minutes before sunrise. */
export const WAKE_BEFORE_MIN = 15

function cached(): Coords | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  }
  catch {
    return null
  }
}

/** Rough position from the time zone offset, when location is unavailable (lat defaults to 45°N/S). */
function fromTimezone(): Coords {
  const offsetMin = -new Date().getTimezoneOffset()
  const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  const south = /Australia|Pacific\/Auckland|America\/(?:Sao_Paulo|Buenos_Aires|Santiago|Montevideo)|Africa\/Johannesburg/.test(tz)
  return { lat: south ? -33 : 45, lon: offsetMin / 4, at: Date.now(), approx: true }
}

let current: Coords | null = cached()

/** Best known position; asks for location once (coarse), refreshes at most daily. */
export async function locate(ask = false): Promise<Coords> {
  const fresh = current && !current.approx && Date.now() - current.at < 86_400_000
  if (fresh)
    return current!
  if (Capacitor.isNativePlatform() || ask) {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.checkPermissions()
        if (perm.coarseLocation !== 'granted' && perm.location !== 'granted') {
          if (!ask)
            throw new Error('not asked')
          await Geolocation.requestPermissions({ permissions: ['coarseLocation'] })
        }
      }
      const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 86_400_000 })
      current = { lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100, at: Date.now() }
      localStorage.setItem(KEY, JSON.stringify(current))
      return current
    }
    catch {}
  }
  return current ?? fromTimezone()
}

/** Last known position without prompting (sync, for rendering). */
export function knownCoords(): Coords {
  return current ?? fromTimezone()
}

/** Sunrise on that day as a Date (falls back to 6:00 in polar day/night). */
export function sunriseOn(day: Date, c: Coords = knownCoords()): Date {
  const noon = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12)
  const t = SunCalc.getTimes(noon, c.lat, c.lon).sunrise
  if (!t || Number.isNaN(t.getTime()))
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 6, 0)
  return t
}

export function sunriseHM(day: Date, c?: Coords): string {
  return formatHM(sunriseOn(day, c))
}

/** Alarm time for that morning: a little before sunrise, rounded down to 5 minutes. */
export function wakeHM(day: Date, c?: Coords): string {
  const d = new Date(sunriseOn(day, c).getTime() - WAKE_BEFORE_MIN * 60_000)
  d.setMinutes(d.getMinutes() - (d.getMinutes() % 5))
  return formatHM(d)
}
