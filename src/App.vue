<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppHeader from './components/AppHeader.vue'
import PhotoCropper from './components/PhotoCropper.vue'
import A4Page from './components/A4Page.vue'
import { activePhoto, importFiles, persistProject, removePhoto, resetProject, restoreProject, state } from './store/photoStore'
import { packPhotos } from './utils/packing'
import { loadStep, saveStep } from './utils/persistence'
const step = ref(loadStep()), input = ref<HTMLInputElement>(), loading = ref(false), initialized = ref(false), showBackWarning = ref(false)
const pages = computed(() => packPhotos(state.photos, state.templates, state.margin, state.gap))
async function receive(files: FileList | null) { if (!files?.length) return; loading.value = true; try { await importFiles([...files]); if (state.photos.length) step.value = 2 } finally { loading.value = false; if (input.value) input.value.value = '' } }
function printPages() { window.print() }
function setActiveTemplate(templateId: string) { if (!activePhoto.value) return; activePhoto.value.templateId = templateId; activePhoto.value.cropValidated = false }
async function confirmBack() { loading.value = true; try { await resetProject(); step.value = 1; showBackWarning.value = false } finally { loading.value = false } }
onMounted(async () => {
  try { await restoreProject(); if (!state.photos.length) step.value = 1 } finally { initialized.value = true }
  saveStep(step.value)
  let timer: number | undefined
  watch(state, () => { window.clearTimeout(timer); timer = window.setTimeout(persistProject, 150) }, { deep: true })
  watch(step, saveStep)
  window.addEventListener('beforeunload', () => { persistProject(); saveStep(step.value) })
})
</script>

<template>
  <q-layout view="hHh lpR fFf" class="bg-dark text-white"><AppHeader /><q-page-container><q-page class="q-pa-md q-pa-lg-xl">
    <section v-if="step === 1" class="full-width q-pa-lg q-pl-xl">
      <div class="text-overline text-primary">Photo print organizer</div><div class="text-h3 text-weight-bold q-mt-sm">Fit more photos on fewer A4 sheets</div><div class="text-body1 text-grey-4 q-mt-md" style="max-width: 680px">Add photos in bulk, choose their print sizes, crop them, and generate an efficient layout ready to print.</div><div class="q-mt-lg"><q-btn color="primary" text-color="black" icon="add_photo_alternate" label="Choose photos" size="lg" @click="input?.click()" /></div>
    </section>

    <section v-else-if="step === 2">
      <div class="row items-center justify-between q-mb-lg"><div><div class="text-overline text-primary">Prepare photos</div><div class="text-h4 text-weight-bold">Crop and choose a size</div></div><q-badge color="primary" text-color="black" class="q-pa-sm">{{ state.activeIndex + 1 }} / {{ state.photos.length }}</q-badge></div>
      <div class="row q-col-gutter-lg items-start">
        <aside class="col-12 col-md-3 col-lg-2"><q-card flat bordered class="bg-grey-10 text-white"><q-card-section class="row items-center justify-between"><div class="text-h6">Photos</div><q-btn flat round dense color="primary" icon="add_photo_alternate" @click="input?.click()" /></q-card-section><q-separator dark /><q-list separator class="photo-list"><q-item v-for="(photo, index) in state.photos" :key="photo.id" clickable :active="index === state.activeIndex" active-class="bg-grey-9 text-primary" @click="state.activeIndex=index"><q-item-section avatar><q-img :src="photo.url" width="52px" height="52px" fit="cover" /></q-item-section><q-item-section><q-item-label lines="1">{{ photo.name }}</q-item-label><q-item-label caption class="text-grey-5">Photo {{ index + 1 }}</q-item-label></q-item-section><q-item-section v-if="photo.cropValidated" side><q-icon name="check_circle" color="positive" size="24px"><q-tooltip>Crop validated</q-tooltip></q-icon></q-item-section></q-item></q-list></q-card></aside>
        <div class="col-12 col-md-6 col-lg-7"><q-card flat bordered class="bg-grey-10 text-white"><q-card-section><PhotoCropper /></q-card-section></q-card></div>
        <aside v-if="activePhoto" class="col-12 col-md-3"><q-card flat bordered class="bg-grey-10 text-white"><q-card-section><div class="text-overline text-primary">Photo details</div><div class="text-subtitle1 text-weight-bold ellipsis">{{ activePhoto.name }}</div><div class="text-caption text-grey-5">{{ activePhoto.naturalWidth }} × {{ activePhoto.naturalHeight }} px</div></q-card-section><q-separator dark /><q-card-section><div class="text-subtitle2 q-mb-sm">Photo size</div><div class="text-caption text-grey-5 q-mb-sm">The crop always keeps its proportions.</div><q-option-group :model-value="activePhoto.templateId" :options="state.templates.map(t => ({ label: t.name, value: t.id }))" color="primary" type="radio" @update:model-value="setActiveTemplate" /></q-card-section><q-separator dark /><q-card-section><q-btn v-if="!activePhoto.cropValidated" class="full-width" color="positive" text-color="white" icon="check_circle" label="Validate crop" @click="activePhoto.cropValidated=true" /><q-btn v-else class="full-width" outline color="positive" icon="check_circle" label="Crop validated" @click="activePhoto.cropValidated=false"><q-tooltip>Click to mark this crop as needing review</q-tooltip></q-btn></q-card-section><q-card-actions><q-btn flat color="negative" icon="delete_outline" label="Remove photo" @click="removePhoto(activePhoto.id)" /></q-card-actions></q-card></aside>
      </div>
      <div class="row justify-between items-center q-mt-xl"><q-btn flat color="grey-4" icon="arrow_back" label="Back" @click="showBackWarning=true" /><div class="q-gutter-sm"><q-btn flat color="grey-4" label="Previous" :disable="state.activeIndex===0" @click="state.activeIndex--" /><q-btn color="primary" text-color="black" icon-right="arrow_forward" label="Next photo" :disable="state.activeIndex >= state.photos.length-1" @click="state.activeIndex++" /><q-btn color="primary" text-color="black" icon="auto_awesome_mosaic" label="Arrange pages" @click="step=3" /></div></div>
    </section>

    <section v-else>
      <div class="row items-center justify-between q-mb-lg"><div><div class="text-overline text-primary">Arrange and print</div><div class="text-h4 text-weight-bold">A4 layout</div><div class="text-body2 text-grey-4 q-mt-xs">{{ state.photos.length }} photos on {{ pages.length }} sheet{{ pages.length === 1 ? '' : 's' }}</div></div><div class="q-gutter-sm"><q-btn outline color="primary" icon="edit" label="Edit photos" @click="step=2" /><q-btn color="primary" text-color="black" icon="print" label="Print sheets" @click="printPages" /></div></div>
      <q-card flat bordered class="bg-grey-10 text-white q-mb-lg"><q-card-section class="row q-col-gutter-xl"><div class="col-12 col-sm-6"><div class="row justify-between text-caption"><span>Page margin</span><b>{{state.margin}} mm</b></div><q-slider v-model="state.margin" :min="0" :max="20" color="primary" /></div><div class="col-12 col-sm-6"><div class="row justify-between text-caption"><span>Photo spacing</span><b>{{state.gap}} mm</b></div><q-slider v-model="state.gap" :min="0" :max="10" color="primary" /></div></q-card-section></q-card>
      <div class="row q-col-gutter-xl justify-center"><div v-for="(page,index) in pages" :key="index" class="col-12 col-sm-6 col-lg-4"><A4Page :page="page" :number="index+1" /></div></div>
    </section>
    <input ref="input" hidden multiple type="file" accept="image/*" @change="receive(($event.target as HTMLInputElement).files)" /><q-inner-loading :showing="loading || !initialized" dark><q-spinner color="primary" size="48px" /></q-inner-loading>
    <q-dialog v-model="showBackWarning" persistent><q-card class="bg-grey-10 text-white" style="width: 460px; max-width: 94vw"><q-card-section class="row items-center q-gutter-md"><q-icon name="warning" color="negative" size="36px" /><div><div class="text-h6">Erase this project?</div><div class="text-body2 text-grey-4">Going back will remove every imported photo, crop, size choice, and validation.</div></div></q-card-section><q-card-actions align="right"><q-btn flat color="grey-4" label="Keep working" v-close-popup /><q-btn color="negative" icon="delete_forever" label="Erase and go back" @click="confirmBack" /></q-card-actions></q-card></q-dialog>
  </q-page></q-page-container></q-layout>
</template>
