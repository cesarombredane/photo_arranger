<script setup lang="ts">
import type { PackedPage } from '../types'
defineProps<{ page: PackedPage, number: number }>()
</script>
<template><div class="page-wrap"><div class="page-label">Sheet {{number}} <span>A4 · 210 × 297 mm</span></div><div class="a4-page"><div v-for="p in page.placements" :key="p.photo.id" class="placed-photo" :style="{left:`${p.x/210*100}%`,top:`${p.y/297*100}%`,width:`${p.width/210*100}%`,height:`${p.height/297*100}%`}"><img :src="p.photo.url" :style="{objectPosition:`${p.photo.crop.x}% ${p.photo.crop.y}%`,transform:`scale(${p.photo.crop.zoom})`}"/><span>{{p.photo.name}}</span></div></div></div></template>
