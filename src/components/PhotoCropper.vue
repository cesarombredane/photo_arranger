<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { activePhoto, state } from '../store/photoStore'

type Side = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'move'
const imageBox = ref<HTMLElement>()
let dragging: Side | null = null
let dragOrigin: { x: number; y: number; left: number; top: number; right: number; bottom: number } | null = null
const minimum = 3

const imageAspect = computed(() => activePhoto.value ? activePhoto.value.naturalWidth / activePhoto.value.naturalHeight : 1)
const imageBoxStyle = computed(() => ({
  aspectRatio: String(imageAspect.value),
  width: `min(100%, ${Math.round(520 * imageAspect.value)}px)`
}))
const cropPixels = computed(() => {
  const photo = activePhoto.value
  if (!photo) return { width: 0, height: 0 }
  return {
    width: Math.round(photo.naturalWidth * (photo.crop.right - photo.crop.left) / 100),
    height: Math.round(photo.naturalHeight * (photo.crop.bottom - photo.crop.top) / 100)
  }
})

function startDrag(side: Side, event: PointerEvent) {
  dragging = side
  const rect = imageBox.value?.getBoundingClientRect()
  const photo = activePhoto.value
  if (rect && photo) dragOrigin = { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100, ...photo.crop }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', moveDrag)
  window.addEventListener('pointerup', stopDrag, { once: true })
}
function moveDrag(event: PointerEvent) {
  const photo = activePhoto.value
  const rect = imageBox.value?.getBoundingClientRect()
  if (!photo || !rect || !dragging) return
  const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))
  const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))
  if (dragging === 'move' && dragOrigin) {
    const deltaX = Math.max(-dragOrigin.left, Math.min(100 - dragOrigin.right, x - dragOrigin.x))
    const deltaY = Math.max(-dragOrigin.top, Math.min(100 - dragOrigin.bottom, y - dragOrigin.y))
    photo.crop.left = dragOrigin.left + deltaX
    photo.crop.right = dragOrigin.right + deltaX
    photo.crop.top = dragOrigin.top + deltaY
    photo.crop.bottom = dragOrigin.bottom + deltaY
    photo.cropValidated = false
    return
  }
  if (dragging.includes('left')) photo.crop.left = Math.min(x, photo.crop.right - minimum)
  if (dragging.includes('right')) photo.crop.right = Math.max(x, photo.crop.left + minimum)
  if (dragging.includes('top')) photo.crop.top = Math.min(y, photo.crop.bottom - minimum)
  if (dragging.includes('bottom')) photo.crop.bottom = Math.max(y, photo.crop.top + minimum)
  photo.cropValidated = false
}
function stopDrag() {
  dragging = null
  dragOrigin = null
  window.removeEventListener('pointermove', moveDrag)
}
function resetCrop() {
  if (!activePhoto.value) return
  activePhoto.value.crop = { left: 0, top: 0, right: 100, bottom: 100 }
  activePhoto.value.cropValidated = false
}
function snapToOptimizedRatio() {
  const photo = activePhoto.value
  if (!photo) return
  const template = state.templates.find(item => item.id === photo.templateId)
  if (!template) return
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
onBeforeUnmount(stopDrag)
</script>

<template>
  <div v-if="activePhoto">
    <div class="text-caption text-grey-4 q-mb-md">Drag any yellow edge to crop. The complete original image remains visible behind the crop area.</div>
    <div ref="imageBox" class="crop-image-box" :style="imageBoxStyle">
      <img :src="activePhoto.url" draggable="false" />
      <div class="crop-shade crop-shade--top" :style="{ height: `${activePhoto.crop.top}%` }" />
      <div class="crop-shade crop-shade--bottom" :style="{ top: `${activePhoto.crop.bottom}%` }" />
      <div class="crop-shade crop-shade--left" :style="{ top: `${activePhoto.crop.top}%`, width: `${activePhoto.crop.left}%`, height: `${activePhoto.crop.bottom-activePhoto.crop.top}%` }" />
      <div class="crop-shade crop-shade--right" :style="{ top: `${activePhoto.crop.top}%`, left: `${activePhoto.crop.right}%`, height: `${activePhoto.crop.bottom-activePhoto.crop.top}%` }" />
      <button type="button" class="crop-outline" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%`, width: `${activePhoto.crop.right-activePhoto.crop.left}%`, height: `${activePhoto.crop.bottom-activePhoto.crop.top}%` }" aria-label="Move crop selection" @pointerdown.prevent="startDrag('move',$event)" />
      <button class="crop-handle crop-handle--left" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%`, height: `${activePhoto.crop.bottom-activePhoto.crop.top}%` }" aria-label="Crop left edge" @pointerdown.prevent="startDrag('left',$event)" />
      <button class="crop-handle crop-handle--right" :style="{ left: `${activePhoto.crop.right}%`, top: `${activePhoto.crop.top}%`, height: `${activePhoto.crop.bottom-activePhoto.crop.top}%` }" aria-label="Crop right edge" @pointerdown.prevent="startDrag('right',$event)" />
      <button class="crop-handle crop-handle--top" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%`, width: `${activePhoto.crop.right-activePhoto.crop.left}%` }" aria-label="Crop top edge" @pointerdown.prevent="startDrag('top',$event)" />
      <button class="crop-handle crop-handle--bottom" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.bottom}%`, width: `${activePhoto.crop.right-activePhoto.crop.left}%` }" aria-label="Crop bottom edge" @pointerdown.prevent="startDrag('bottom',$event)" />
      <button class="crop-corner crop-corner--top-left" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%` }" aria-label="Crop top-left corner" @pointerdown.prevent="startDrag('top-left',$event)" />
      <button class="crop-corner crop-corner--top-right" :style="{ left: `${activePhoto.crop.right}%`, top: `${activePhoto.crop.top}%` }" aria-label="Crop top-right corner" @pointerdown.prevent="startDrag('top-right',$event)" />
      <button class="crop-corner crop-corner--bottom-left" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.bottom}%` }" aria-label="Crop bottom-left corner" @pointerdown.prevent="startDrag('bottom-left',$event)" />
      <button class="crop-corner crop-corner--bottom-right" :style="{ left: `${activePhoto.crop.right}%`, top: `${activePhoto.crop.bottom}%` }" aria-label="Crop bottom-right corner" @pointerdown.prevent="startDrag('bottom-right',$event)" />
    </div>
    <div class="row items-center justify-between q-mt-md"><div class="text-caption text-grey-4">Crop: {{ cropPixels.width }} × {{ cropPixels.height }} px</div><div class="q-gutter-sm"><q-btn outline color="primary" icon="aspect_ratio" label="Snap to optimized ratio" @click="snapToOptimizedRatio"><q-tooltip>Match the selected photo size for a more efficient layout</q-tooltip></q-btn><q-btn flat color="primary" icon="restart_alt" label="Reset crop" @click="resetCrop" /></div></div>
  </div>
</template>
