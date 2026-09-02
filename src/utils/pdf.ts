import { clip, degrees, endPath, PDFDocument, type PDFImage, type PDFPage, popGraphicsState, pushGraphicsState, rectangle } from 'pdf-lib';
import type { PackedPage, Placement } from '../types';
import { loadPhotoFile } from './persistence';

const POINTS_PER_MM = 72 / 25.4;
const A4 = { width: 210 * POINTS_PER_MM, height: 297 * POINTS_PER_MM };

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load an image for the PDF.'));
    image.src = url;
  });
}

function canvasJpeg(canvas: HTMLCanvasElement) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) {
        reject(new Error('Could not encode an image for the PDF.'));
        return;
      }
      resolve(await blob.arrayBuffer());
    }, 'image/jpeg', 0.98);
  });
}

async function croppedJpeg(placement: Placement) {
  const { photo } = placement;
  const image = await loadImage(photo.url);
  const sourceWidth = photo.naturalWidth * (photo.crop.right - photo.crop.left) / 100;
  const sourceHeight = photo.naturalHeight * (photo.crop.bottom - photo.crop.top) / 100;
  const canvas = document.createElement('canvas');
  // Retain every available pixel in the selected crop. There is deliberately no
  // DPI ceiling; physical sizing is applied only when placing it on the PDF page.
  canvas.width = Math.max(1, Math.round(sourceWidth));
  canvas.height = Math.max(1, Math.round(sourceHeight));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available in this browser.');
  context.drawImage(
    image,
    photo.naturalWidth * photo.crop.left / 100,
    photo.naturalHeight * photo.crop.top / 100,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvasJpeg(canvas);
}

async function nativeImage(document: PDFDocument, placement: Placement) {
  const file = await loadPhotoFile(placement.photo.id);
  if (!file) return;
  const bytes = await file.arrayBuffer();
  try {
    let image: PDFImage | undefined;
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') image = await document.embedJpg(bytes);
    if (file.type === 'image/png') image = await document.embedPng(bytes);
    if (!image) return;
    // A swapped ratio means the browser applied EXIF orientation. The native PDF
    // image would be sideways, so keep using the orientation-aware fallback.
    const browserRatio = placement.photo.naturalWidth / placement.photo.naturalHeight;
    const embeddedRatio = image.width / image.height;
    if (Math.abs(Math.log(browserRatio / embeddedRatio)) > 0.01) return;
    return image;
  } catch {
    // Some files have an incorrect MIME type. Let the browser conversion path
    // handle those instead of aborting the whole document.
  }
}

function drawNativeImage(page: PDFPage, image: PDFImage, placement: Placement) {
  const { photo } = placement;
  const left = placement.x * POINTS_PER_MM;
  const bottom = A4.height - (placement.y + placement.height) * POINTS_PER_MM;
  const boxWidth = placement.width * POINTS_PER_MM;
  const boxHeight = placement.height * POINTS_PER_MM;
  const cropLeft = photo.crop.left / 100;
  const cropBottom = (100 - photo.crop.bottom) / 100;
  const cropWidth = (photo.crop.right - photo.crop.left) / 100;
  const cropHeight = (photo.crop.bottom - photo.crop.top) / 100;

  page.pushOperators(
    pushGraphicsState(),
    rectangle(left, bottom, boxWidth, boxHeight),
    clip(),
    endPath()
  );
  if (placement.rotated) {
    const fullWidth = boxHeight / cropWidth;
    const fullHeight = boxWidth / cropHeight;
    page.drawImage(image, {
      x: left + boxWidth + cropBottom * fullHeight,
      y: bottom - cropLeft * fullWidth,
      width: fullWidth,
      height: fullHeight,
      rotate: degrees(90)
    });
  } else {
    const fullWidth = boxWidth / cropWidth;
    const fullHeight = boxHeight / cropHeight;
    page.drawImage(image, {
      x: left - cropLeft * fullWidth,
      y: bottom - cropBottom * fullHeight,
      width: fullWidth,
      height: fullHeight
    });
  }
  page.pushOperators(popGraphicsState());
}

export async function createPhotoPdf(pages: PackedPage[], onProgress?: (done: number, total: number) => void) {
  const document = await PDFDocument.create();
  const total = pages.reduce((count, page) => count + page.placements.length, 0);
  let done = 0;

  for (const packedPage of pages) {
    const page = document.addPage([A4.width, A4.height]);
    for (const placement of packedPage.placements) {
      const embeddedOriginal = await nativeImage(document, placement);
      if (embeddedOriginal) {
        drawNativeImage(page, embeddedOriginal, placement);
        onProgress?.(++done, total);
        continue;
      }

      const image = await document.embedJpg(await croppedJpeg(placement).catch(error => {
        throw new Error(`Could not convert “${placement.photo.name}”: ${error instanceof Error ? error.message : 'unknown image error'}`);
      }));
      const left = placement.x * POINTS_PER_MM;
      const bottom = A4.height - (placement.y + placement.height) * POINTS_PER_MM;
      if (placement.rotated) {
        page.drawImage(image, {
          x: left + placement.width * POINTS_PER_MM,
          y: bottom,
          width: placement.height * POINTS_PER_MM,
          height: placement.width * POINTS_PER_MM,
          rotate: degrees(90)
        });
      } else {
        page.drawImage(image, {
          x: left,
          y: bottom,
          width: placement.width * POINTS_PER_MM,
          height: placement.height * POINTS_PER_MM
        });
      }
      onProgress?.(++done, total);
    }
  }

  return document.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
