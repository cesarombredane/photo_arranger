<script setup lang="ts">
import { computed, ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import WorkflowSteps from './components/WorkflowSteps.vue'
import TemplateManager from './components/TemplateManager.vue'
import PhotoCropper from './components/PhotoCropper.vue'
import A4Page from './components/A4Page.vue'
import { activePhoto, importFiles, removePhoto, state } from './store/photoStore'
import { packPhotos } from './utils/packing'
const step = ref(1), dragging = ref(false), input = ref<HTMLInputElement>(), loading = ref(false)
const pages = computed(() => packPhotos(state.photos, state.templates, state.margin, state.gap))
async function receive(files: FileList | null) { if (!files?.length) return; loading.value = true; try { await importFiles([...files]); if (state.photos.length) step.value = 2 } finally { loading.value = false; if (input.value) input.value.value = '' } }
function drop(event: DragEvent) { dragging.value = false; receive(event.dataTransfer?.files ?? null) }
function selectStep(next: number) { if (next === 1 || state.photos.length) step.value = next }
function printPages() { window.print() }
</script>

<template>
  <q-layout view="hHh lpR fFf" class="bg-dark text-white"><AppHeader /><q-page-container><q-page class="q-pa-md q-pa-lg-xl"><WorkflowSteps :step="step" @select="selectStep" />
    <section v-if="step === 1" class="row q-col-gutter-lg items-stretch">
      <div class="col-12 col-md-5 column justify-center q-pa-lg"><div class="text-overline text-primary">Photo print organizer</div><div class="text-h3 text-weight-bold q-mt-sm">Fit more photos on fewer A4 sheets</div><div class="text-body1 text-grey-4 q-mt-md">Add photos in bulk, choose their print sizes, crop them, and generate an efficient layout ready to print.</div><div class="q-mt-lg"><q-btn color="primary" text-color="black" icon="add_photo_alternate" label="Choose photos" size="lg" @click="input?.click()" /></div></div>
      <div class="col-12 col-md-7"><q-card flat bordered class="bg-grey-10 text-white full-height"><q-card-section class="drop-area column flex-center text-center q-pa-xl" :class="{ 'drop-area--active': dragging }" @dragover.prevent="dragging=true" @dragleave="dragging=false" @drop.prevent="drop"><q-icon name="cloud_upload" color="primary" size="64px" /><div class="text-h6 q-mt-md">Drop your photos here</div><div class="text-body2 text-grey-4 q-mt-xs">JPG, PNG, WEBP and other browser-supported images</div><q-btn outline color="primary" icon="folder_open" label="Browse files" class="q-mt-lg" @click="input?.click()" /></q-card-section></q-card></div>
    </section>

    <section v-else-if="step === 2">
      <div class="row items-center justify-between q-mb-lg"><div><div class="text-overline text-primary">Prepare photos</div><div class="text-h4 text-weight-bold">Crop and choose a size</div></div><q-badge color="primary" text-color="black" class="q-pa-sm">{{ state.activeIndex + 1 }} / {{ state.photos.length }}</q-badge></div>
      <div class="row q-col-gutter-lg items-start">
        <aside class="col-12 col-md-3 col-lg-2"><q-card flat bordered class="bg-grey-10 text-white"><q-card-section class="row items-center justify-between"><div class="text-h6">Photos</div><q-btn flat round dense color="primary" icon="add_photo_alternate" @click="input?.click()" /></q-card-section><q-separator dark /><q-list separator class="photo-list"><q-item v-for="(photo, index) in state.photos" :key="photo.id" clickable :active="index === state.activeIndex" active-class="bg-grey-9 text-primary" @click="state.activeIndex=index"><q-item-section avatar><q-img :src="photo.url" width="52px" height="52px" fit="cover" /></q-item-section><q-item-section><q-item-label lines="1">{{ photo.name }}</q-item-label><q-item-label caption class="text-grey-5">Photo {{ index + 1 }}</q-item-label></q-item-section></q-item></q-list></q-card></aside>
        <div class="col-12 col-md-6 col-lg-7"><q-card flat bordered class="bg-grey-10 text-white"><q-card-section><PhotoCropper /></q-card-section></q-card></div>
        <aside v-if="activePhoto" class="col-12 col-md-3"><q-card flat bordered class="bg-grey-10 text-white"><q-card-section><div class="text-overline text-primary">Photo details</div><div class="text-subtitle1 text-weight-bold ellipsis">{{ activePhoto.name }}</div><div class="text-caption text-grey-5">{{ activePhoto.naturalWidth }} × {{ activePhoto.naturalHeight }} px</div></q-card-section><q-separator dark /><q-card-section><div class="text-subtitle2 q-mb-sm">Print size</div><q-option-group v-model="activePhoto.templateId" :options="state.templates.map(t => ({ label: `${t.name} — ${t.width} × ${t.height} mm`, value: t.id }))" color="primary" type="radio" /></q-card-section><q-card-actions><q-btn flat color="negative" icon="delete_outline" label="Remove photo" @click="removePhoto(activePhoto.id)" /></q-card-actions></q-card></aside>
      </div>
      <TemplateManager />
      <div class="row justify-between q-mt-xl"><q-btn flat color="grey-4" icon="arrow_back" label="Back" @click="step=1" /><div class="q-gutter-sm"><q-btn flat color="grey-4" label="Previous" :disable="state.activeIndex===0" @click="state.activeIndex--" /><q-btn v-if="state.activeIndex < state.photos.length-1" color="primary" text-color="black" icon-right="arrow_forward" label="Next photo" @click="state.activeIndex++" /><q-btn v-else color="primary" text-color="black" icon-right="auto_awesome_mosaic" label="Arrange pages" @click="step=3" /></div></div>
    </section>

    <section v-else>
      <div class="row items-center justify-between q-mb-lg"><div><div class="text-overline text-primary">Arrange and print</div><div class="text-h4 text-weight-bold">A4 layout</div><div class="text-body2 text-grey-4 q-mt-xs">{{ state.photos.length }} photos on {{ pages.length }} sheet{{ pages.length === 1 ? '' : 's' }}</div></div><div class="q-gutter-sm"><q-btn outline color="primary" icon="edit" label="Edit photos" @click="step=2" /><q-btn color="primary" text-color="black" icon="print" label="Print sheets" @click="printPages" /></div></div>
      <q-card flat bordered class="bg-grey-10 text-white q-mb-lg"><q-card-section class="row q-col-gutter-xl"><div class="col-12 col-sm-6"><div class="row justify-between text-caption"><span>Page margin</span><b>{{state.margin}} mm</b></div><q-slider v-model="state.margin" :min="0" :max="20" color="primary" /></div><div class="col-12 col-sm-6"><div class="row justify-between text-caption"><span>Photo spacing</span><b>{{state.gap}} mm</b></div><q-slider v-model="state.gap" :min="0" :max="10" color="primary" /></div></q-card-section></q-card>
      <div class="row q-col-gutter-xl justify-center"><div v-for="(page,index) in pages" :key="index" class="col-12 col-sm-6 col-lg-4"><A4Page :page="page" :number="index+1" /></div></div>
    </section>
    <input ref="input" hidden multiple type="file" accept="image/*" @change="receive(($event.target as HTMLInputElement).files)" /><q-inner-loading :showing="loading" dark><q-spinner color="primary" size="48px" /></q-inner-loading>
  </q-page></q-page-container></q-layout>
</template>
