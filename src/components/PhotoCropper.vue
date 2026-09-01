<script setup lang="ts">
import { computed } from 'vue'; import { activePhoto, state } from '../store/photoStore'
const template = computed(() => state.templates.find(t => t.id === activePhoto.value?.templateId))
const frameStyle = computed(() => ({ aspectRatio: `${template.value?.width ?? 1} / ${template.value?.height ?? 1}` }))
const imageStyle = computed(() => ({ transform: `translate(${(activePhoto.value?.crop.x ?? 50)-50}%, ${(activePhoto.value?.crop.y ?? 50)-50}%) scale(${activePhoto.value?.crop.zoom ?? 1})` }))
</script>
<template><div v-if="activePhoto" class="crop-workspace"><div class="crop-frame" :style="frameStyle"><img :src="activePhoto.url" :style="imageStyle" draggable="false"/><div class="crop-grid"></div></div><div class="crop-controls"><label>Zoom <q-slider v-model="activePhoto.crop.zoom" :min="1" :max="3" :step=".01" color="primary"/></label><label>Horizontal <q-slider v-model="activePhoto.crop.x" :min="0" :max="100" color="primary"/></label><label>Vertical <q-slider v-model="activePhoto.crop.y" :min="0" :max="100" color="primary"/></label><q-btn flat icon="restart_alt" label="Reset crop" @click="activePhoto.crop={x:50,y:50,zoom:1}"/></div></div></template>
