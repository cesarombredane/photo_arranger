import type { PackedPage, PhotoItem, Placement, SizeTemplate } from '../types'

const A4 = { width: 210, height: 297 }
type FreeRect = { x: number; y: number; width: number; height: number }

export function packPhotos(photos: PhotoItem[], templates: SizeTemplate[], margin = 8, gap = 3): PackedPage[] {
  const sizes = photos.map(photo => ({ photo, template: templates.find(t => t.id === photo.templateId)! }))
    .filter(item => item.template).sort((a, b) => Math.max(b.template.width, b.template.height) - Math.max(a.template.width, a.template.height))
  const pages: PackedPage[] = []
  const freeByPage: FreeRect[][] = []
  const usable = { x: margin, y: margin, width: A4.width - margin * 2, height: A4.height - margin * 2 }

  for (const item of sizes) {
    let best: { page: number; rect: number; rotated: boolean; score: number } | undefined
    for (let p = 0; p <= pages.length; p++) {
      const rects = p === pages.length ? [usable] : freeByPage[p]
      for (let r = 0; r < rects.length; r++) for (const rotated of [false, true]) {
        const width = (rotated ? item.template.height : item.template.width) + gap
        const height = (rotated ? item.template.width : item.template.height) + gap
        if (width <= rects[r].width && height <= rects[r].height) {
          const score = rects[r].width * rects[r].height - width * height + p * 100000
          if (!best || score < best.score) best = { page: p, rect: r, rotated, score }
        }
      }
    }
    if (!best) continue
    if (best.page === pages.length) { pages.push({ placements: [] }); freeByPage.push([usable]) }
    const rect = freeByPage[best.page].splice(best.rect, 1)[0]
    const width = best.rotated ? item.template.height : item.template.width
    const height = best.rotated ? item.template.width : item.template.height
    const placement: Placement = { photo: item.photo, x: rect.x, y: rect.y, width, height, rotated: best.rotated }
    pages[best.page].placements.push(placement)
    const usedW = width + gap, usedH = height + gap
    const right = { x: rect.x + usedW, y: rect.y, width: rect.width - usedW, height: usedH }
    const below = { x: rect.x, y: rect.y + usedH, width: rect.width, height: rect.height - usedH }
    if (right.width > 0 && right.height > 0) freeByPage[best.page].push(right)
    if (below.width > 0 && below.height > 0) freeByPage[best.page].push(below)
  }
  return pages
}
