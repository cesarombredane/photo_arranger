<script setup lang="ts">
  import { computed, onBeforeUnmount, ref } from 'vue';
  import { activePhoto, state } from '../store/photoStore';
  import { nearestTemplateRatio, rotateOptimizedCrop, snapCurrentCropToTemplate } from '../utils/cropping';


  type Side = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'move';
  const imageBox = ref<HTMLElement>();
  let dragging: Side | null = null;
  let dragOrigin: { x: number; y: number; left: number; top: number; right: number; bottom: number; } | null = null;
  const minimum = 3;


  const imageAspect = computed(() => activePhoto.value ? activePhoto.value.naturalWidth / activePhoto.value.naturalHeight : 1);

  const imageBoxStyle = computed(() => ({
    aspectRatio: String(imageAspect.value),
    width: `min(100%, ${Math.round(520 * imageAspect.value)}px)`
  }));

  const cropPixels = computed(() => {
    const photo = activePhoto.value;
    if (!photo) return { width: 0, height: 0 };
    return {
      width: Math.round(photo.naturalWidth * (photo.crop.right - photo.crop.left) / 100),
      height: Math.round(photo.naturalHeight * (photo.crop.bottom - photo.crop.top) / 100)
    };
  });


  function startDrag(side: Side, event: PointerEvent) {
    dragging = side;
    const rect = imageBox.value?.getBoundingClientRect();
    const photo = activePhoto.value;
    if (rect && photo) dragOrigin = { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100, ...photo.crop }
      ; (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', stopDrag, { once: true });
  }

  function moveDrag(event: PointerEvent) {
    const photo = activePhoto.value;
    const rect = imageBox.value?.getBoundingClientRect();
    if (!photo || !rect || !dragging) return;
    const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
    if (dragging === 'move' && dragOrigin) {
      const deltaX = Math.max(-dragOrigin.left, Math.min(100 - dragOrigin.right, x - dragOrigin.x));
      const deltaY = Math.max(-dragOrigin.top, Math.min(100 - dragOrigin.bottom, y - dragOrigin.y));
      photo.crop.left = dragOrigin.left + deltaX;
      photo.crop.right = dragOrigin.right + deltaX;
      photo.crop.top = dragOrigin.top + deltaY;
      photo.crop.bottom = dragOrigin.bottom + deltaY;
      photo.cropValidated = false;
      return;
    }
    if (photo.forceOptimizedRatio && dragOrigin) resizeAtOptimizedRatio(photo, x, y);
    else {
      if (dragging.includes('left')) photo.crop.left = Math.min(x, photo.crop.right - minimum);
      if (dragging.includes('right')) photo.crop.right = Math.max(x, photo.crop.left + minimum);
      if (dragging.includes('top')) photo.crop.top = Math.min(y, photo.crop.bottom - minimum);
      if (dragging.includes('bottom')) photo.crop.bottom = Math.max(y, photo.crop.top + minimum);
    }
    photo.cropValidated = false;
  }

  function resizeAtOptimizedRatio(photo: NonNullable<typeof activePhoto.value>, x: number, y: number) {
    if (!dragOrigin || !dragging) return;
    const template = state.templates.find(item => item.id === photo.templateId);
    if (!template) return;
    const percentRatio = nearestTemplateRatio(photo, template) / imageAspect.value;
    let left = dragOrigin.left, right = dragOrigin.right, top = dragOrigin.top, bottom = dragOrigin.bottom;
    const horizontal = dragging.includes('left') || dragging.includes('right');
    const vertical = dragging.includes('top') || dragging.includes('bottom');
    if (horizontal && vertical) {
      const anchorX = dragging.includes('left') ? dragOrigin.right : dragOrigin.left;
      const anchorY = dragging.includes('top') ? dragOrigin.bottom : dragOrigin.top;
      let width = Math.max(minimum, Math.abs(x - anchorX));
      let height = Math.max(minimum, Math.abs(y - anchorY));
      if (width / height > percentRatio) width = height * percentRatio;
      else height = width / percentRatio;
      const scale = Math.min(1, (dragging.includes('left') ? anchorX : 100 - anchorX) / width, (dragging.includes('top') ? anchorY : 100 - anchorY) / height);
      width *= scale; height *= scale;
      left = dragging.includes('left') ? anchorX - width : anchorX;
      right = dragging.includes('right') ? anchorX + width : anchorX;
      top = dragging.includes('top') ? anchorY - height : anchorY;
      bottom = dragging.includes('bottom') ? anchorY + height : anchorY;
    } else if (horizontal) {
      const anchorX = dragging.includes('left') ? dragOrigin.right : dragOrigin.left;
      let width = Math.max(minimum, Math.abs(x - anchorX));
      let height = width / percentRatio;
      const centerY = (dragOrigin.top + dragOrigin.bottom) / 2;
      const scale = Math.min(1, (dragging.includes('left') ? anchorX : 100 - anchorX) / width, 2 * Math.min(centerY, 100 - centerY) / height);
      width *= scale; height *= scale;
      left = dragging.includes('left') ? anchorX - width : anchorX;
      right = dragging.includes('right') ? anchorX + width : anchorX;
      top = centerY - height / 2; bottom = centerY + height / 2;
    } else if (vertical) {
      const anchorY = dragging.includes('top') ? dragOrigin.bottom : dragOrigin.top;
      let height = Math.max(minimum, Math.abs(y - anchorY));
      let width = height * percentRatio;
      const centerX = (dragOrigin.left + dragOrigin.right) / 2;
      const scale = Math.min(1, (dragging.includes('top') ? anchorY : 100 - anchorY) / height, 2 * Math.min(centerX, 100 - centerX) / width);
      width *= scale; height *= scale;
      top = dragging.includes('top') ? anchorY - height : anchorY;
      bottom = dragging.includes('bottom') ? anchorY + height : anchorY;
      left = centerX - width / 2; right = centerX + width / 2;
    }
    photo.crop = { left, top, right, bottom };
  }

  function stopDrag() {
    dragging = null;
    dragOrigin = null;
    window.removeEventListener('pointermove', moveDrag);
  }

  function resetCrop() {
    if (!activePhoto.value) return;
    activePhoto.value.crop = { left: 0, top: 0, right: 100, bottom: 100 };
    activePhoto.value.forceOptimizedRatio = false;
    activePhoto.value.cropValidated = false;
  }

  function setForceOptimizedRatio(enabled: boolean) {
    const photo = activePhoto.value;
    if (!photo) return;
    const template = state.templates.find(item => item.id === photo.templateId);
    if (!template) return;
    photo.forceOptimizedRatio = enabled;
    if (enabled) snapCurrentCropToTemplate(photo, template);
  }

  function rotateSelection() {
    const photo = activePhoto.value;
    if (!photo?.forceOptimizedRatio) return;
    const template = state.templates.find(item => item.id === photo.templateId);
    if (template) rotateOptimizedCrop(photo, template);
  }


  onBeforeUnmount(stopDrag);
</script>

<template>
  <div v-if="activePhoto">
    <div class="text-caption text-grey-4 q-mb-md">Drag any yellow edge to crop. The complete original image remains visible behind the crop area.</div>
    <div ref="imageBox" class="crop-image-box" :style="imageBoxStyle">
      <img :src="activePhoto.url" draggable="false" />
      <div class="crop-shade crop-shade--top" :style="{ height: `${activePhoto.crop.top}%` }" />
      <div class="crop-shade crop-shade--bottom" :style="{ top: `${activePhoto.crop.bottom}%` }" />
      <div class="crop-shade crop-shade--left"
        :style="{ top: `${activePhoto.crop.top}%`, width: `${activePhoto.crop.left}%`, height: `${activePhoto.crop.bottom - activePhoto.crop.top}%` }" />
      <div class="crop-shade crop-shade--right"
        :style="{ top: `${activePhoto.crop.top}%`, left: `${activePhoto.crop.right}%`, height: `${activePhoto.crop.bottom - activePhoto.crop.top}%` }" />
      <button type="button" class="crop-outline"
        :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%`, width: `${activePhoto.crop.right - activePhoto.crop.left}%`, height: `${activePhoto.crop.bottom - activePhoto.crop.top}%` }"
        aria-label="Move crop selection" @pointerdown.prevent="startDrag('move', $event)" />
      <button class="crop-handle crop-handle--left"
        :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%`, height: `${activePhoto.crop.bottom - activePhoto.crop.top}%` }"
        aria-label="Crop left edge" @pointerdown.prevent="startDrag('left', $event)" />
      <button class="crop-handle crop-handle--right"
        :style="{ left: `${activePhoto.crop.right}%`, top: `${activePhoto.crop.top}%`, height: `${activePhoto.crop.bottom - activePhoto.crop.top}%` }"
        aria-label="Crop right edge" @pointerdown.prevent="startDrag('right', $event)" />
      <button class="crop-handle crop-handle--top"
        :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%`, width: `${activePhoto.crop.right - activePhoto.crop.left}%` }"
        aria-label="Crop top edge" @pointerdown.prevent="startDrag('top', $event)" />
      <button class="crop-handle crop-handle--bottom"
        :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.bottom}%`, width: `${activePhoto.crop.right - activePhoto.crop.left}%` }"
        aria-label="Crop bottom edge" @pointerdown.prevent="startDrag('bottom', $event)" />
      <button class="crop-corner crop-corner--top-left" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.top}%` }" aria-label="Crop top-left corner"
        @pointerdown.prevent="startDrag('top-left', $event)" />
      <button class="crop-corner crop-corner--top-right" :style="{ left: `${activePhoto.crop.right}%`, top: `${activePhoto.crop.top}%` }"
        aria-label="Crop top-right corner" @pointerdown.prevent="startDrag('top-right', $event)" />
      <button class="crop-corner crop-corner--bottom-left" :style="{ left: `${activePhoto.crop.left}%`, top: `${activePhoto.crop.bottom}%` }"
        aria-label="Crop bottom-left corner" @pointerdown.prevent="startDrag('bottom-left', $event)" />
      <button class="crop-corner crop-corner--bottom-right" :style="{ left: `${activePhoto.crop.right}%`, top: `${activePhoto.crop.bottom}%` }"
        aria-label="Crop bottom-right corner" @pointerdown.prevent="startDrag('bottom-right', $event)" />
    </div>
    <div class="row items-center justify-between q-mt-md">
      <div class="text-caption text-grey-4">Crop: {{ cropPixels.width }} × {{ cropPixels.height }} px</div>
      <div class="row items-center q-gutter-sm"><q-checkbox :model-value="!!activePhoto.forceOptimizedRatio" color="primary" label="Force optimized ratio"
          @update:model-value="setForceOptimizedRatio(!!$event)"><q-tooltip>Snap to the nearest optimized ratio and keep it while resizing</q-tooltip></q-checkbox><q-btn
          v-if="activePhoto.forceOptimizedRatio" outline color="primary" icon="screen_rotation" label="Rotate selection" @click="rotateSelection"><q-tooltip>Switch
            between portrait and landscape</q-tooltip></q-btn><q-btn flat color="primary" icon="restart_alt" label="Reset crop" @click="resetCrop" /></div>
    </div>
  </div>
</template>
