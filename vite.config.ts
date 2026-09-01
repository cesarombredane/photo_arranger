import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { fileURLToPath } from 'node:url';

const variables = fileURLToPath(new URL('./src/styles/quasar-variables.sass', import.meta.url));
export default defineConfig({ plugins: [vue({ template: { transformAssetUrls } }), quasar({ sassVariables: variables })] });
