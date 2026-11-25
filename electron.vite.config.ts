import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const sharedAlias = {
  '@': path.resolve(__dirname, 'src'),
  '@shared': path.resolve(__dirname, 'src/shared'),
  '@main': path.resolve(__dirname, 'src/main'),
  '@preload': path.resolve(__dirname, 'src/preload'),
  '@renderer': path.resolve(__dirname, 'src/renderer'),
};

export default defineConfig({
  main: {
    resolve: {
      alias: sharedAlias,
    },
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'src/main/index.ts'),
      },
    },
  },
  preload: {
    resolve: {
      alias: sharedAlias,
    },
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'src/preload/shellPreload.ts'),
      },
    },
  },
  renderer: {
    resolve: {
      alias: sharedAlias,
    },
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'src/renderer/index.html'),
      },
    },
    plugins: [react()],
  },
});