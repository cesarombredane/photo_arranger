import type { PackedPage, PhotoItem, Placement, SizeTemplate } from '../types'

const A4 = { width: 210, height: 297 }
type Rect = { x: number; y: number; width: number; height: number }
type SizedPhoto = { photo: PhotoItem; width: number; height: number }
type Candidate = { page: number; rect: Rect; rotated: boolean; shortSide: number; longSide: number }
type OrientationMode = 'mixed' | 'natural-first' | 'rotated-first'

function intersects(a: Rect, b: Rect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function contains(outer: Rect, inner: Rect) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height
}

function splitFreeRects(freeRects: Rect[], used: Rect): Rect[] {
  const split: Rect[] = []
  for (const free of freeRects) {
    if (!intersects(free, used)) { split.push(free); continue }
    if (used.x > free.x) split.push({ x: free.x, y: free.y, width: used.x - free.x, height: free.height })
    if (used.x + used.width < free.x + free.width) split.push({ x: used.x + used.width, y: free.y, width: free.x + free.width - used.x - used.width, height: free.height })
    if (used.y > free.y) split.push({ x: free.x, y: free.y, width: free.width, height: used.y - free.y })
    if (used.y + used.height < free.y + free.height) split.push({ x: free.x, y: used.y + used.height, width: free.width, height: free.y + free.height - used.y - used.height })
  }
  return split.filter((rect, index, all) => rect.width > 0.001 && rect.height > 0.001 && !all.some((other, otherIndex) => otherIndex !== index && contains(other, rect)))
}

function sizePhotos(photos: PhotoItem[], templates: SizeTemplate[], usable: Rect, gap: number): SizedPhoto[] {
  return photos.flatMap(photo => {
    const template = templates.find(item => item.id === photo.templateId)
    if (!template) return []
    const cropWidth = photo.naturalWidth * (photo.crop.right - photo.crop.left) / 100
    const cropHeight = photo.naturalHeight * (photo.crop.bottom - photo.crop.top) / 100
    const ratio = cropWidth / cropHeight
    const targetArea = template.width * template.height
    let width = Math.sqrt(targetArea * ratio)
    let height = Math.sqrt(targetArea / ratio)
    const availableWidth = Math.max(0, usable.width - gap)
    const availableHeight = Math.max(0, usable.height - gap)
    const normalScale = Math.min(availableWidth / width, availableHeight / height)
    const rotatedScale = Math.min(availableWidth / height, availableHeight / width)
    const scale = Math.min(1, Math.max(normalScale, rotatedScale))
    width *= scale
    height *= scale
    return [{ photo, width, height }]
  })
}

function findPositionForOrientations(item: SizedPhoto, freeByPage: Rect[][], gap: number, orientations: boolean[]): Candidate | undefined {
  let best: Candidate | undefined
  for (let page = 0; page < freeByPage.length; page++) {
    for (const rect of freeByPage[page]) {
      for (const rotated of orientations) {
        const width = (rotated ? item.height : item.width) + gap
        const height = (rotated ? item.width : item.height) + gap
        if (width > rect.width + 0.001 || height > rect.height + 0.001) continue
        const leftoverX = rect.width - width
        const leftoverY = rect.height - height
        const candidate = { page, rect, rotated, shortSide: Math.min(leftoverX, leftoverY), longSide: Math.max(leftoverX, leftoverY) }
        if (!best || candidate.page < best.page || (candidate.page === best.page && (candidate.shortSide < best.shortSide || (candidate.shortSide === best.shortSide && candidate.longSide < best.longSide)))) best = candidate
      }
    }
  }
  return best
}

function findPosition(item: SizedPhoto, freeByPage: Rect[][], gap: number, mode: OrientationMode): Candidate | undefined {
  if (mode === 'mixed') return findPositionForOrientations(item, freeByPage, gap, [false, true])
  const preferred = mode === 'natural-first'
  return findPositionForOrientations(item, freeByPage, gap, [preferred ? false : true])
    ?? findPositionForOrientations(item, freeByPage, gap, [preferred ? true : false])
}

function packOrdered(items: SizedPhoto[], usable: Rect, gap: number, mode: OrientationMode): PackedPage[] {
  const pages: PackedPage[] = []
  const freeByPage: Rect[][] = []
  for (const item of items) {
    let candidate = findPosition(item, freeByPage, gap, mode)
    if (!candidate) {
      pages.push({ placements: [] })
      freeByPage.push([{ ...usable }])
      candidate = findPosition(item, freeByPage, gap, mode)
    }
    if (!candidate) continue
    const width = candidate.rotated ? item.height : item.width
    const height = candidate.rotated ? item.width : item.height
    const placement: Placement = { photo: item.photo, x: candidate.rect.x, y: candidate.rect.y, width, height, rotated: candidate.rotated }
    pages[candidate.page].placements.push(placement)
    const occupied = { x: candidate.rect.x, y: candidate.rect.y, width: width + gap, height: height + gap }
    freeByPage[candidate.page] = splitFreeRects(freeByPage[candidate.page], occupied)
  }
  return pages
}

function layoutScore(pages: PackedPage[]) {
  const last = pages.at(-1)
  const lastBottom = last?.placements.reduce((maximum, placement) => Math.max(maximum, placement.y + placement.height), 0) ?? 0
  return pages.length * 1_000_000 + lastBottom
}

const optimizedGrids: Record<string, { columns: number; rows: number; width: number; height: number }> = {
  small: { columns: 3, rows: 2, width: 70, height: 148 },
  medium: { columns: 2, rows: 2, width: 105, height: 148 },
  big: { columns: 1, rows: 2, width: 210, height: 148 }
}

function matchesOptimizedRatio(item: SizedPhoto, grid: { width: number; height: number }) {
  const ratio = item.width / item.height
  const optimized = grid.width / grid.height
  return Math.min(Math.abs(ratio / optimized - 1), Math.abs(ratio * optimized - 1)) < 0.0001
}

function extractPerfectPages(items: SizedPhoto[]) {
  const pages: PackedPage[] = []
  const remaining = [...items]
  for (const [templateId, grid] of Object.entries(optimizedGrids)) {
    const groupSize = grid.columns * grid.rows
    const matches = remaining.filter(item => item.photo.templateId === templateId && matchesOptimizedRatio(item, grid))
    const completeCount = Math.floor(matches.length / groupSize) * groupSize
    for (let offset = 0; offset < completeCount; offset += groupSize) {
      const placements: Placement[] = matches.slice(offset, offset + groupSize).map((item, index) => {
        const rotated = Math.abs(item.width / item.height - grid.width / grid.height) >= 0.0001
        return { photo: item.photo, x: index % grid.columns * grid.width, y: Math.floor(index / grid.columns) * grid.height, width: grid.width, height: grid.height, rotated }
      })
      pages.push({ placements })
    }
    const extracted = new Set(matches.slice(0, completeCount).map(item => item.photo.id))
    for (let index = remaining.length - 1; index >= 0; index--) if (extracted.has(remaining[index].photo.id)) remaining.splice(index, 1)
  }
  return { pages, remaining }
}

export function packPhotos(photos: PhotoItem[], templates: SizeTemplate[]): PackedPage[] {
  const gap = 0
  const usable = { x: 0, y: 0, width: A4.width, height: A4.height }
  if (usable.width <= 0 || usable.height <= 0) return []
  const items = sizePhotos(photos, templates, usable, gap)
  const perfect = extractPerfectPages(items)
  const orderings = [
    [...perfect.remaining].sort((a, b) => b.width * b.height - a.width * a.height),
    [...perfect.remaining].sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height)),
    [...perfect.remaining].sort((a, b) => b.height - a.height),
    [...perfect.remaining].sort((a, b) => b.width - a.width),
    [...perfect.remaining].sort((a, b) => Math.abs(Math.log(b.width / b.height)) - Math.abs(Math.log(a.width / a.height)))
  ]
  const modes: OrientationMode[] = ['mixed', 'natural-first', 'rotated-first']
  const remainder = orderings.flatMap(order => modes.map(mode => packOrdered(order, usable, gap, mode))).sort((a, b) => layoutScore(a) - layoutScore(b))[0] ?? []
  return [...perfect.pages, ...remainder]
}
