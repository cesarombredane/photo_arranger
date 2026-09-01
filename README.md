# Paperfit

A local-first Vue app that crops, sizes, and automatically packs photos onto as few A4 sheets as practical.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. A production build can be created with `npm run build`.

## Workflow

1. Bulk-select or drag and drop photos.
2. Review each photo, adjust its crop, and assign a reusable print-size template.
3. Let the packing algorithm rotate and arrange photos across A4 sheets, tune margins/spacing, then print.

All photos stay in the browser as local object URLs. Nothing is uploaded or stored remotely.
