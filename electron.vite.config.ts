import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  main: {
    input: path.resolve(__dirname, 'src/main/index.ts'),
  },
  preload: {
    input: path.resolve(__dirname, 'src/preload/shellPreload.ts'),
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': path.resolve(__dirname, 'src/renderer'),
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@main': path.resolve(__dirname, 'src/main'),
        '@preload': path.resolve(__dirname, 'src/preload'),
      },
    },
    plugins: [react()],
  },
});