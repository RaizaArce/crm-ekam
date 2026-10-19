import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            manifest: {
                name: 'CRM EKAM',
                short_name: 'CRM EKAM',
                description: 'Gestión de interesados y embudo de ventas de EKAM PERU S.A.C.',
                lang: 'es-PE',
                start_url: '/',
                display: 'standalone',
                background_color: '#F6F9FC',
                theme_color: '#061D5A',
                icons: [
                    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                // Los datos siempre vienen de Supabase: solo se guarda en caché la aplicación.
                navigateFallback: '/index.html',
                globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
            },
        }),
    ],
});
