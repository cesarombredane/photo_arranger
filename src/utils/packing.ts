import type { PackedPage, PhotoItem, Placement, SizeTemplate } from '../types'

const A4 = { width: 210, height: 297 }
type FreeRect = { x: number; y: number; width: number; height: number }

export function packPhotos(photos: PhotoItem[], templates: SizeTemplate[], margin = 8, gap = 3): PackedPage[] {
  const sizes = photos.map(photo => {
    const template = templates.find(t => t.id === photo.templateId)!
    if (!template) return undefined
    const cropWidth = photo.naturalWidth * (photo.crop.right - photo.crop.left) / 100
    const cropHeight = photo.naturalHeight * (photo.crop.bottom - photo.crop.top) / 100
    const ratio = cropWidth / cropHeight
    // Templates represent a target print area rather than a forced bounding box.
    // This prevents tall phone photos from becoming much smaller than landscape photos.
    const targetArea = template.width * template.height
    let width = Math.sqrt(targetArea * ratio)
    let height = Math.sqrt(targetArea / ratio)
    // Very extreme panoramas still need to fit on an A4 sheet in either orientation.
    const normalScale = Math.min(A4.width / width, A4.height / height)
    const rotatedScale = Math.min(A4.width / height, A4.height / width)
    const pageScale = Math.min(1, Math.max(normalScale, rotatedScale))
    width *= pageScale
    height *= pageScale
    return { photo, width, height }
  }).filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height))
  const pages: PackedPage[] = []
  const freeByPage: FreeRect[][] = []
  const usable = { x: margin, y: margin, width: A4.width - margin * 2, height: A4.height - margin * 2 }

  for (const item of sizes) {
    let best: { page: number; rect: number; rotated: boolean; score: number } | undefined
    for (let p = 0; p <= pages.length; p++) {
      const rects = p === pages.length ? [usable] : freeByPage[p]
      for (let r = 0; r < rects.length; r++) for (const rotated of [false, true]) {
        const width = (rotated ? item.height : item.width) + gap
        const height = (rotated ? item.width : item.height) + gap
        if (width <= rects[r].width && height <= rects[r].height) {
          const score = rects[r].width * rects[r].height - width * height + p * 100000
          if (!best || score < best.score) best = { page: p, rect: r, rotated, score }
        }
      }
    }
    if (!best) continue
    if (best.page === pages.length) { pages.push({ placements: [] }); freeByPage.push([usable]) }
    const rect = freeByPage[best.page].splice(best.rect, 1)[0]
    const width = best.rotated ? item.height : item.width
    const height = best.rotated ? item.width : item.height
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
