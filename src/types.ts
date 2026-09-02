export interface SizeTemplate { id: string; name: string; width: number; height: number; color: string; }
export interface Crop { left: number; top: number; right: number; bottom: number; }
export interface PhotoItem { id: string; name: string; url: string; naturalWidth: number; naturalHeight: number; templateId: string; crop: Crop; cropValidated: boolean; forceOptimizedRatio?: boolean; }
export interface Placement { photo: PhotoItem; x: number; y: number; width: number; height: number; rotated: boolean; }
export interface PackedPage { placements: Placement[]; }
