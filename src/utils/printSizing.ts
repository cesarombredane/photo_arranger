import type { PhotoItem, SizeTemplate } from '../types'

export function croppedPixels(photo: PhotoItem) {
  return {
    width: photo.naturalWidth * (photo.crop.right - photo.crop.left) / 100,
    height: photo.naturalHeight * (photo.crop.bottom - photo.crop.top) / 100
  }
}

export function calculatedPrintSize(photo: PhotoItem, template: SizeTemplate, maximum = { width: 210, height: 297 }) {
  const pixels = croppedPixels(photo)
  const ratio = pixels.width / pixels.height
  const targetArea = template.width * template.height
  let width = Math.sqrt(targetArea * ratio)
  let height = Math.sqrt(targetArea / ratio)
  const normalScale = Math.min(maximum.width / width, maximum.height / height)
  const rotatedScale = Math.min(maximum.width / height, maximum.height / width)
  const scale = Math.min(1, Math.max(normalScale, rotatedScale))
  width *= scale
  height *= scale
  return { width, height }
}

export function effectiveDpi(photo: PhotoItem, template: SizeTemplate) {
  const pixels = croppedPixels(photo)
  const print = calculatedPrintSize(photo, template)
  return Math.floor(Math.min(pixels.width / (print.width / 25.4), pixels.height / (print.height / 25.4)))
}

export function dpiQuality(dpi: number) {
  if (dpi >= 300) return { label: 'Excellent', color: 'positive' }
  if (dpi >= 150) return { label: 'Acceptable', color: 'warning' }
  return { label: 'Low resolution', color: 'negative' }
}
