import type { PhotoItem } from '../types'

const DATABASE = 'photo-arranger'
const STORE = 'photo-files'
const META_KEY = 'photo-arranger:project'
const STEP_KEY = 'photo-arranger:step'

interface StoredProject {
  photos: Omit<PhotoItem, 'url'>[]
  activeIndex: number
  gap: number
  margin: number
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact(mode: IDBTransactionMode, action: (store: IDBObjectStore) => void) {
  const db = await database()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    action(transaction.objectStore(STORE))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

export async function savePhotoFile(id: string, file: Blob) {
  await transact('readwrite', store => { store.put(file, id) })
}

export async function deletePhotoFile(id: string) {
  await transact('readwrite', store => { store.delete(id) })
}

export async function loadPhotoFile(id: string): Promise<Blob | undefined> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
    request.onsuccess = () => { db.close(); resolve(request.result as Blob | undefined) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

export function saveProject(project: StoredProject) {
  localStorage.setItem(META_KEY, JSON.stringify(project))
}

export function loadProject(): StoredProject | undefined {
  const value = localStorage.getItem(META_KEY)
  if (!value) return undefined
  try { return JSON.parse(value) as StoredProject } catch { return undefined }
}

export function saveStep(step: number) { localStorage.setItem(STEP_KEY, String(step)) }
export function loadStep() { return Number(localStorage.getItem(STEP_KEY)) || 1 }

export async function clearSavedProject() {
  localStorage.removeItem(META_KEY)
  localStorage.removeItem(STEP_KEY)
  await transact('readwrite', store => { store.clear() })
}
