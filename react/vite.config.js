import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* No manual chunking. It existed to keep three.js out of the entry chunk;
   with the 3D backdrop gone there is one bundle and it is small. */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020' }
});
