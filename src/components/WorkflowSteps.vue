<script setup lang="ts">
defineProps<{ step: number }>()
defineEmits<{ (event: 'select', step: number): void }>()
</script>
<template><nav class="steps">
  <button v-for="(item, index) in [{icon:'add_photo_alternate',label:'Add photos'},{icon:'crop',label:'Prepare'},{icon:'auto_awesome_mosaic',label:'Arrange & print'}]" :key="item.label" :class="{active: step === index + 1, done: step > index + 1}" @click="$emit('select', index + 1)"><span>{{ index + 1 }}</span><q-icon :name="item.icon" />{{ item.label }}</button>
</nav></template>
