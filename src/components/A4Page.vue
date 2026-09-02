<script setup lang="ts">
  import type { PackedPage } from '../types';
  import type { PhotoItem, Placement } from '../types';


  defineProps<{ page: PackedPage, number: number; }>();
  defineEmits<{ (event: 'photo-click', photo: PhotoItem): void; }>();


  function cropStyle(photo: PhotoItem) {
    const width = photo.crop.right - photo.crop.left;
    const height = photo.crop.bottom - photo.crop.top;
    return { width: `${10000 / width}%`, height: `${10000 / height}%`, left: `${-photo.crop.left / width * 100}%`, top: `${-photo.crop.top / height * 100}%` };
  }

  function contentStyle(placement: Placement) {
    if (!placement.rotated) return { inset: '0' };
    return { left: '50%', top: '50%', width: `${placement.height / placement.width * 100}%`, height: `${placement.width / placement.height * 100}%`, transform: 'translate(-50%, -50%) rotate(90deg)' };
  }
</script>

<template>
  <div class="page-wrap">
    <div class="page-label">Sheet {{ number }} <span>A4 · 210 × 297 mm</span></div>
    <div class="a4-page"><button v-for="p in page.placements" :key="p.photo.id" type="button" class="placed-photo"
        :style="{ left: `${p.x / 210 * 100}%`, top: `${p.y / 297 * 100}%`, width: `${p.width / 210 * 100}%`, height: `${p.height / 297 * 100}%` }"
        :aria-label="`Edit ${p.photo.name}`" @click="$emit('photo-click', p.photo)">
        <div class="placed-photo-content" :style="contentStyle(p)"><img :src="p.photo.url" :style="cropStyle(p.photo)" /></div><span>{{ p.photo.name }}</span>
      </button></div>
  </div>
</template>
