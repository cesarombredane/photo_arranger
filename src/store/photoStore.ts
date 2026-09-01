import { computed, reactive } from 'vue'
import type { PhotoItem, SizeTemplate } from '../types'
import { clearSavedProject, deletePhotoFile, loadPhotoFile, loadProject, savePhotoFile, saveProject } from '../utils/persistence'

export const state = reactive({
  photos: [] as PhotoItem[],
  templates: [
    { id: 'small', name: 'Phone photo', width: 70, height: 148, color: '#fdd835' },
    { id: 'medium', name: 'Medium photo', width: 105, height: 148, color: '#fdd835' },
    { id: 'big', name: 'Big photo', width: 210, height: 148, color: '#fdd835' }
  ] as SizeTemplate[],
  activeIndex: 0
})

export const activePhoto = computed(() => state.photos[state.activeIndex])
export async function removePhoto(id: string) {
  const item = state.photos.find(p => p.id === id)
  if (item) URL.revokeObjectURL(item.url)
  state.photos = state.photos.filter(p => p.id !== id)
  state.activeIndex = Math.min(state.activeIndex, Math.max(0, state.photos.length - 1))
  await deletePhotoFile(id)
}
export async function importFiles(files: File[]) {
  const images = files.filter(file => file.type.startsWith('image/'))
  const loaded = await Promise.all(images.map(file => new Promise<PhotoItem>((resolve, reject) => {
    const id = crypto.randomUUID()
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = async () => { await savePhotoFile(id, file); resolve({ id, name: file.name, url, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, templateId: state.templates[0].id, crop: { left: 0, top: 0, right: 100, bottom: 100 }, cropValidated: false }) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not load ${file.name}`)) }
    image.src = url
  })))
  state.photos.push(...loaded)
}

export function persistProject() {
  saveProject({ photos: state.photos.map(({ url: _url, ...photo }) => photo), activeIndex: state.activeIndex })
}

export async function restoreProject() {
  const saved = loadProject()
  if (!saved) return
  const restored: PhotoItem[] = []
  for (const photo of saved.photos) {
    const file = await loadPhotoFile(photo.id)
    if (file) restored.push({ ...photo, url: URL.createObjectURL(file) })
  }
  state.photos = restored
  state.activeIndex = Math.min(saved.activeIndex, Math.max(0, restored.length - 1))
}

export async function resetProject() {
  state.photos.forEach(photo => URL.revokeObjectURL(photo.url))
  state.photos = []
  state.activeIndex = 0
  await clearSavedProject()
}
