<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { activePhoto } from '../store/photoStore'

type Side = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
const imageBox = ref<HTMLElement>()
let dragging: Side | null = null
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
  if (dragging.includes('left')) photo.crop.left = Math.min(x, photo.crop.right - minimum)
  if (dragging.includes('right')) photo.crop.right = Math.max(x, photo.crop.left + minimum)
  if (dragging.includes('top')) photo.crop.top = Math.min(y, photo.crop.bottom - minimum)
  if (dragging.includes('bottom')) photo.crop.bottom = Math.max(y, photo.crop.top + minimum)
  photo.cropValidated = false
}
function stopDrag() {
  dragging = null
  window.removeEventListener('pointermove', moveDrag)
}
function resetCrop() {
  if (!activePhoto.value) return
  activePhoto.value.crop = { left: 0, top: 0, right: 100, bottom: 100 }
  activePhoto.value.cropValidated = false
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
      <div class="crop-outline" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%`, width: `${activePhoto.crop.right-activePhoto.crop.left}%`, height: `${activePhoto.crop.bottom-activePhoto.crop.top}%` }" />
      <button class="crop-handle crop-handle--left" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%`, height: `${activePhoto.crop.bottom-activePhoto.crop.top}%` }" aria-label="Crop left edge" @pointerdown.prevent="startDrag('left',$event)" />
      <button class="crop-handle crop-handle--right" :style="{ left: `${activePhoto.crop.right}%`, top: `${activePhoto.crop.top}%`, height: `${activePhoto.crop.bottom-activePhoto.crop.top}%` }" aria-label="Crop right edge" @pointerdown.prevent="startDrag('right',$event)" />
      <button class="crop-handle crop-handle--top" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%`, width: `${activePhoto.crop.right-activePhoto.crop.left}%` }" aria-label="Crop top edge" @pointerdown.prevent="startDrag('top',$event)" />
      <button class="crop-handle crop-handle--bottom" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.bottom}%`, width: `${activePhoto.crop.right-activePhoto.crop.left}%` }" aria-label="Crop bottom edge" @pointerdown.prevent="startDrag('bottom',$event)" />
      <button class="crop-corner crop-corner--top-left" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%` }" aria-label="Crop top-left corner" @pointerdown.prevent="startDrag('top-left',$event)" />
      <button class="crop-corner crop-corner--top-right" :style="{ left: `${activePhoto.crop.right}%`, top: `${activePhoto.crop.top}%` }" aria-label="Crop top-right corner" @pointerdown.prevent="startDrag('top-right',$event)" />
      <button class="crop-corner crop-corner--bottom-left" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.bottom}%` }" aria-label="Crop bottom-left corner" @pointerdown.prevent="startDrag('bottom-left',$event)" />
      <button class="crop-corner crop-corner--bottom-right" :style="{ left: `${activePhoto.crop.right}%`, top: `${activePhoto.crop.bottom}%` }" aria-label="Crop bottom-right corner" @pointerdown.prevent="startDrag('bottom-right',$event)" />
    </div>
    <div class="row items-center justify-between q-mt-md"><div class="text-caption text-grey-4">Crop: {{ cropPixels.width }} × {{ cropPixels.height }} px</div><q-btn flat color="primary" icon="restart_alt" label="Reset crop" @click="resetCrop" /></div>
  </div>
</template>
