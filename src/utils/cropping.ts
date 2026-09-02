import type { PhotoItem, SizeTemplate } from '../types'

export function nearestTemplateRatio(photo: PhotoItem, template: SizeTemplate) {
  const cropRatio = photo.naturalWidth * (photo.crop.right - photo.crop.left) /
    (photo.naturalHeight * (photo.crop.bottom - photo.crop.top))
  const referenceRatio = template.width / template.height
  const inverseRatio = 1 / referenceRatio
  return Math.abs(Math.log(cropRatio / referenceRatio)) <= Math.abs(Math.log(cropRatio / inverseRatio)) ? referenceRatio : inverseRatio
}

export function snapCurrentCropToTemplate(photo: PhotoItem, template: SizeTemplate) {
  const targetPercentRatio = nearestTemplateRatio(photo, template) / (photo.naturalWidth / photo.naturalHeight)
  const width = photo.crop.right - photo.crop.left
  const height = photo.crop.bottom - photo.crop.top
  const centerX = (photo.crop.left + photo.crop.right) / 2
  const centerY = (photo.crop.top + photo.crop.bottom) / 2
  const nextWidth = width / height > targetPercentRatio ? height * targetPercentRatio : width
  const nextHeight = width / height > targetPercentRatio ? height : width / targetPercentRatio
  photo.crop = { left: centerX - nextWidth / 2, right: centerX + nextWidth / 2, top: centerY - nextHeight / 2, bottom: centerY + nextHeight / 2 }
  photo.cropValidated = false
}

export function rotateOptimizedCrop(photo: PhotoItem, template: SizeTemplate) {
  const targetRatio = 1 / nearestTemplateRatio(photo, template)
  const targetPercentRatio = targetRatio / (photo.naturalWidth / photo.naturalHeight)
  const currentWidth = photo.crop.right - photo.crop.left
  const currentHeight = photo.crop.bottom - photo.crop.top
  const centerX = (photo.crop.left + photo.crop.right) / 2
  const centerY = (photo.crop.top + photo.crop.bottom) / 2
  let width = Math.sqrt(currentWidth * currentHeight * targetPercentRatio)
  let height = width / targetPercentRatio
  const scale = Math.min(1, 2 * Math.min(centerX, 100 - centerX) / width, 2 * Math.min(centerY, 100 - centerY) / height)
  width *= scale
  height *= scale
  photo.crop = { left: centerX - width / 2, right: centerX + width / 2, top: centerY - height / 2, bottom: centerY + height / 2 }
  photo.cropValidated = false
}

export function snapPhotoToTemplate(photo: PhotoItem, template: SizeTemplate) {
  const imageRatio = photo.naturalWidth / photo.naturalHeight
  const referenceRatio = template.width / template.height
  const inverseRatio = 1 / referenceRatio
  const targetRatio = Math.abs(Math.log(imageRatio / referenceRatio)) <= Math.abs(Math.log(imageRatio / inverseRatio)) ? referenceRatio : inverseRatio
  if (imageRatio > targetRatio) {
    const widthPercent = targetRatio / imageRatio * 100
    photo.crop.left = (100 - widthPercent) / 2
    photo.crop.right = 100 - photo.crop.left
    photo.crop.top = 0
    photo.crop.bottom = 100
  } else {
    const heightPercent = imageRatio / targetRatio * 100
    photo.crop.left = 0
    photo.crop.right = 100
    photo.crop.top = (100 - heightPercent) / 2
    photo.crop.bottom = 100 - photo.crop.top
  }
  photo.cropValidated = false
}
