import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Aparte de vite.config.js: las pruebas no necesitan la PWA.
export default defineConfig({
    plugins: [react()],
    test: {
        include: ['src/**/*.test.{js,jsx}'],
    },
});
