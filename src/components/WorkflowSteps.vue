<script setup lang="ts">
defineProps<{ step: number }>()
defineEmits<{ (event: 'select', step: number): void }>()
</script>
<template>
  <q-tabs :model-value="step" active-color="primary" indicator-color="primary" align="center" class="text-grey-5 q-mb-lg" @update:model-value="$emit('select', Number($event))">
    <q-tab :name="1" icon="add_photo_alternate" label="Add photos" />
    <q-tab :name="2" icon="crop" label="Prepare" />
    <q-tab :name="3" icon="auto_awesome_mosaic" label="Arrange & print" />
  </q-tabs>
</template>
