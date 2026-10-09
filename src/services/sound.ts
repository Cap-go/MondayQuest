import { Capacitor } from '@capacitor/core'
import { NativeAudio } from '@capgo/capacitor-native-audio'

export type Sfx = 'check' | 'erase' | 'tick' | 'page' | 'bell' | 'chime' | 'done' | 'pop' | 'water' | 'whoosh' | 'stamp' | 'shutter' | 'wake' | 'freeze'

const ALL: Sfx[] = ['check', 'erase', 'tick', 'page', 'bell', 'chime', 'done', 'pop', 'water', 'whoosh', 'stamp', 'shutter', 'wake', 'freeze']
const native = Capacitor.isNativePlatform()

let enabled = true
let preloaded = false
const webCache = new Map<Sfx, HTMLAudioElement>()

export function setSoundEnabled(v: boolean) {
  enabled = v
}

async function preload() {
  if (preloaded)
    return
  preloaded = true
  if (!native)
    return
  // NativeAudio mixes with other audio (podcasts while walking) and has near-zero latency.
  await NativeAudio.configure({ focus: false, background: false, ignoreSilent: false }).catch(() => {})
  await Promise.all(ALL.map(id => NativeAudio.preload({
    assetId: id,
    assetPath: `sounds/${id}.wav`,
    audioChannelNum: 1,
    isUrl: false,
  }).catch(() => {})))
}

function webPlay(id: Sfx, volume: number) {
  let a = webCache.get(id)
  if (!a) {
    a = new Audio(`/sounds/${id}.wav`)
    webCache.set(id, a)
  }
  const node = a.cloneNode(true) as HTMLAudioElement
  node.volume = volume
  void node.play().catch(() => {})
}

/** Suspended while the mic is recording: playing a sound resets the iOS audio session and cuts dictation. */
let suspended = false
export function suspendSounds(v: boolean) {
  suspended = v
}

export const sfx = {
  preload,
  play(id: Sfx, volume = 1) {
    if (!enabled || suspended)
      return
    if (!native)
      return webPlay(id, volume)
    void NativeAudio.setVolume({ assetId: id, volume }).catch(() => {})
    void NativeAudio.play({ assetId: id }).catch(() => {})
  },
  stop(id: Sfx) {
    if (native)
      void NativeAudio.stop({ assetId: id }).catch(() => {})
  },
}
