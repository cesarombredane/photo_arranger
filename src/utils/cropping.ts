import type { PhotoItem, SizeTemplate } from '../types'

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
