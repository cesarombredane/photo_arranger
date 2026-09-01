import { computed, reactive } from 'vue'
import type { PhotoItem, SizeTemplate } from '../types'

const colors = ['#e85d3f', '#3f7d70', '#efb366', '#6c75a8', '#c75f7a']
export const state = reactive({
  photos: [] as PhotoItem[],
  templates: [
    { id: 'small', name: 'Small photo', width: 60, height: 40, color: colors[0] },
    { id: 'big', name: 'Big photo', width: 120, height: 80, color: colors[1] }
  ] as SizeTemplate[],
  activeIndex: 0,
  gap: 3,
  margin: 8
})

export const activePhoto = computed(() => state.photos[state.activeIndex])
export function addTemplate(name: string, width: number, height: number) {
  state.templates.push({ id: crypto.randomUUID(), name, width, height, color: colors[state.templates.length % colors.length] })
}
export function removePhoto(id: string) {
  const item = state.photos.find(p => p.id === id)
  if (item) URL.revokeObjectURL(item.url)
  state.photos = state.photos.filter(p => p.id !== id)
  state.activeIndex = Math.min(state.activeIndex, Math.max(0, state.photos.length - 1))
}
export async function importFiles(files: File[]) {
  const images = files.filter(file => file.type.startsWith('image/'))
  const loaded = await Promise.all(images.map(file => new Promise<PhotoItem>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, url, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, templateId: state.templates[0].id, crop: { x: 50, y: 50, zoom: 1 } })
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not load ${file.name}`)) }
    image.src = url
  })))
  state.photos.push(...loaded)
}
