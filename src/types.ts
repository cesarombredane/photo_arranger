export interface SizeTemplate { id: string; name: string; width: number; height: number; color: string }
export interface Crop { x: number; y: number; zoom: number }
export interface PhotoItem { id: string; name: string; url: string; naturalWidth: number; naturalHeight: number; templateId: string; crop: Crop }
export interface Placement { photo: PhotoItem; x: number; y: number; width: number; height: number; rotated: boolean }
export interface PackedPage { placements: Placement[] }
