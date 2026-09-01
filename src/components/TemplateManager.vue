<script setup lang="ts">
import { ref } from 'vue'; import { addTemplate, state } from '../store/photoStore'
const show = ref(false), name = ref('Medium photo'), width = ref(90), height = ref(60)
function save(){ if(name.value.trim() && width.value > 0 && height.value > 0){ addTemplate(name.value.trim(), width.value, height.value); show.value=false } }
</script>
<template>
  <div class="q-mt-lg">
    <div class="text-overline text-primary">Size templates</div>
    <div class="row q-gutter-sm">
      <q-chip v-for="t in state.templates" :key="t.id" square color="grey-9" text-color="white" :label="`${t.name} · ${t.width} × ${t.height} mm`" />
      <q-btn outline color="primary" icon="add" label="New size" no-caps @click="show=true" />
    </div>
  </div>
  <q-dialog v-model="show">
    <q-card class="bg-grey-10 text-white" style="width: 480px; max-width: 94vw">
      <q-card-section><div class="text-h6">Create a size template</div><div class="text-body2 text-grey-4">The target print size and crop ratio.</div></q-card-section>
      <q-card-section class="q-gutter-md"><q-input dark outlined v-model="name" label="Template name"/><div class="row q-col-gutter-md"><q-input class="col" dark outlined v-model.number="width" type="number" suffix="mm" label="Width"/><q-input class="col" dark outlined v-model.number="height" type="number" suffix="mm" label="Height"/></div></q-card-section>
      <q-card-actions align="right"><q-btn flat color="grey-4" label="Cancel" v-close-popup/><q-btn color="primary" text-color="black" label="Create template" @click="save"/></q-card-actions>
    </q-card>
  </q-dialog>
</template>
