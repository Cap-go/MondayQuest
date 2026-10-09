import type { Challenge, Locale } from '~/data/challenges'
import type { Run } from '~/lib/progress'
import { Capacitor } from '@capacitor/core'
import { FileSharer } from '@capgo/capacitor-file-sharer'
import { jsPDF as JsPDF } from 'jspdf'
import { CATEGORY_LABEL, CHALLENGES, LEVELS } from '~/data/challenges'
import { langTag, tr } from '~/i18n/translate'
import { addDays, formatDate } from '~/lib/date'
import { checkedCount } from '~/lib/progress'
import { TRACKERS } from '~/trackers'

// "My notebook" export: a booklet-style A4 PDF with a cover and one page per challenge run.
const PAPER: [number, number, number] = [246, 244, 239]
const INK: [number, number, number] = [20, 20, 20]
const PENCIL: [number, number, number] = [140, 138, 133]
const RULE: [number, number, number] = [217, 214, 207]
const W = 210
const H = 297
const M = 18

interface ExportInput {
  runs: Run[]
  challenge: (id: string) => Challenge | undefined
  locale: Locale
  streak: number
  checks: number
}

/** Built-in PDF fonts are WinAnsi: drop what they cannot draw. */
function clean(s: string): string {
  return s
    .replace(/[→←]/g, '-')
    .replace(/[✓✔]/g, '')
    // WinAnsi = Latin-1 plus a few typographic marks.
    .replace(/./gu, ch => (ch.charCodeAt(0) <= 0xFF || '’‘“”…–—€'.includes(ch) ? ch : ''))
    .trim()
}

/** Translated text when the built-in PDF fonts can draw it (Latin scripts), English otherwise. */
function pt(en: string): string {
  const v = tr(en)
  // Built-in fonts cover Latin (incl. extended) and a few typographic marks only.
  return [...v].some(ch => ch.charCodeAt(0) > 0x24F && !'‘’‚“”„…€'.includes(ch)) ? en : v
}

function paper(doc: JsPDF) {
  doc.setFillColor(...PAPER)
  doc.rect(0, 0, W, H, 'F')
  // the booklet's clipped top-right corner
  doc.setFillColor(255, 255, 255)
  doc.triangle(W - 22, 0, W, 0, W, 22, 'F')
}

/** Hand-drawn style check mark inside a box at (x, y) of size s. */
function check(doc: JsPDF, x: number, y: number, s: number) {
  doc.setDrawColor(...INK)
  doc.setLineWidth(s * 0.11)
  doc.setLineCap('round')
  doc.setLineJoin('round')
  doc.lines([[s * 0.22, s * 0.28], [s * 0.6, -s * 0.84]], x + s * 0.18, y + s * 0.5, [1, 1], 'S', false)
}

function box(doc: JsPDF, x: number, y: number, s: number, on: boolean, faded = false) {
  doc.setDrawColor(...(faded ? RULE : INK))
  doc.setLineWidth(0.7)
  doc.rect(x, y, s, s, 'S')
  if (on)
    check(doc, x, y, s)
}

function footer(doc: JsPDF, page: number) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PENCIL)
  doc.text('mondayquest.com', M, H - 10)
  doc.text(String(page), W - M, H - 10, { align: 'right' })
}

function imageFormat(src: string): 'JPEG' | 'PNG' | null {
  if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg'))
    return 'JPEG'
  if (src.startsWith('data:image/png'))
    return 'PNG'
  return null
}

function cover(doc: JsPDF, input: ExportInput, runs: Run[]) {
  paper(doc)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(54)
  doc.text('MONDAY', M, 70)
  doc.text('QUEST', M, 92)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.text(clean(pt('My notebook')), M, 106)
  const first = runs.at(-1)?.start
  const last = runs[0]?.start
  if (first && last) {
    doc.setFontSize(10)
    doc.setTextColor(...PENCIL)
    doc.text(clean(`${formatDate(first, langTag.value, { day: 'numeric', month: 'long', year: 'numeric' })} - ${formatDate(addDays(last, 6), langTag.value, { day: 'numeric', month: 'long', year: 'numeric' })}`), M, 114)
  }

  // stats in booklet boxes
  const done = runs.filter(r => r.completedAt).length
  const stats: [string, string][] = [
    [String(input.streak), pt('DAYS IN A ROW')],
    [String(input.checks), pt('BOXES TICKED')],
    [`${done}/${CHALLENGES.length}`, pt('CHALLENGES DONE')],
  ]
  const bw = (W - 2 * M) / 3
  stats.forEach(([n, label], i) => {
    const x = M + i * bw
    doc.setDrawColor(...INK)
    doc.setLineWidth(0.8)
    doc.rect(x, 128, bw, 34, 'S')
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.text(n, x + bw / 2, 146, { align: 'center' })
    doc.setFontSize(7)
    doc.text(label, x + bw / 2, 155, { align: 'center' })
  })

  // 52 boxes, a year of Mondays
  const completed = new Set(runs.filter(r => r.completedAt).map(r => r.challengeId))
  const cols = 13
  const s = (W - 2 * M - (cols - 1) * 2.6) / cols
  CHALLENGES.forEach((c, i) => {
    const x = M + (i % cols) * (s + 2.6)
    const y = 180 + Math.floor(i / cols) * (s + 2.6)
    box(doc, x, y, s, completed.has(c.id))
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5)
    doc.setTextColor(...PENCIL)
    doc.text(String(c.n), x + 1, y + 2.6)
  })
  footer(doc, 1)
}

function runPage(doc: JsPDF, input: ExportInput, run: Run, c: Challenge, page: number) {
  const l = input.locale
  const tag = langTag.value
  const text = { title: pt(c.text.title), short: pt(c.text.short) }
  const level = LEVELS.find(x => x.n === c.level)
  paper(doc)
  let y = 30

  doc.setTextColor(...PENCIL)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  const kicker = c.source === 'custom'
    ? pt('MY CHALLENGE')
    : `${pt('LEVEL')} ${level?.roman ?? ''} - ${clean(pt(level?.text ?? '')).toUpperCase()} - N° ${c.n}`
  doc.text(kicker, M, y)
  y += 12

  doc.setTextColor(...INK)
  doc.setFontSize(26)
  const title = doc.splitTextToSize(clean(text.title).toUpperCase(), W - 2 * M - 30)
  doc.text(title, M, y)
  y += title.length * 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const short = doc.splitTextToSize(clean(text.short), W - 2 * M)
  doc.text(short, M, y)
  y += short.length * 5.5 + 2
  doc.setFontSize(9)
  doc.setTextColor(...PENCIL)
  doc.text(clean(`${pt(CATEGORY_LABEL[c.category])} - ${formatDate(run.start, tag, { day: 'numeric', month: 'long', year: 'numeric' })} - ${checkedCount(run)}/7`), M, y)
  y += 10

  // DONE stamp
  if (run.completedAt) {
    doc.setDrawColor(...INK)
    doc.setTextColor(...INK)
    doc.setLineWidth(1.4)
    const sx = W - M - 34
    const sy = 26
    doc.rect(sx, sy, 34, 16, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('DONE', sx + 17, sy + 11.5, { align: 'center' })
  }

  // the seven days
  const summary = TRACKERS[c.tracker]?.summary
  const images: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = run.days[i]!
    const s = 9
    box(doc, M, y - 6, s, d.done, !d.done && !Object.keys(d.data ?? {}).length)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(clean(`${pt('DAY')} ${i + 1}`), M + s + 4, y - 2.6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...PENCIL)
    doc.text(clean(formatDate(addDays(run.start, i), tag, { weekday: 'short', day: 'numeric', month: 'short' })), M + s + 4, y + 1.6)
    const parts = [summary?.(d, l) ?? '']
    const items = d.data?.items
    if (Array.isArray(items))
      parts.push(items.filter(Boolean).join(' / '))
    for (const k of ['note', 'what', 'who', 'topic', 'dish', 'memory', 'text', 'changed']) {
      if (typeof d.data?.[k] === 'string' && d.data[k] && !parts.join(' ').includes(d.data[k]))
        parts.push(d.data[k])
    }
    const line = clean(parts.filter(Boolean).join(' - '))
    if (line) {
      doc.setFontSize(9)
      doc.setTextColor(...INK)
      const wrapped = doc.splitTextToSize(line, W - 2 * M - 52).slice(0, 2)
      doc.text(wrapped, M + 50, y - 2.6)
    }
    for (const v of Object.values(d.data ?? {})) {
      if (typeof v === 'string' && imageFormat(v))
        images.push(v)
    }
    y += 13
  }

  // photos and drawings as a contact sheet
  if (images.length) {
    y += 4
    const size = 40
    images.slice(0, 8).forEach((src, i) => {
      const x = M + (i % 4) * (size + 4)
      const yy = y + Math.floor(i / 4) * (size + 4)
      if (yy + size > H - 18)
        return
      doc.setFillColor(255, 255, 255)
      doc.rect(x - 1.5, yy - 1.5, size + 3, size + 3, 'F')
      try {
        doc.addImage(src, imageFormat(src)!, x, yy, size, size, undefined, 'FAST')
      }
      catch {}
    })
  }
  footer(doc, page)
}

export async function exportNotebook(input: ExportInput) {
  const runs = [...input.runs]
    .filter(r => r.days.some(d => d.done || Object.keys(d.data ?? {}).length))
    .sort((a, b) => b.start.localeCompare(a.start))
  const doc = new JsPDF({ unit: 'mm', format: 'a4' })
  cover(doc, input, runs)
  let page = 2
  for (const r of runs) {
    const c = input.challenge(r.challengeId)
    if (!c)
      continue
    doc.addPage()
    runPage(doc, input, r, c, page++)
  }
  const filename = `monday-quest-${new Date().toISOString().slice(0, 10)}.pdf`
  if (!Capacitor.isNativePlatform()) {
    doc.save(filename)
    return
  }
  const base64Data = doc.output('datauristring').split(',')[1]!
  await FileSharer.share({ filename, base64Data, contentType: 'application/pdf', title: 'Monday Quest' })
}
