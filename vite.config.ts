import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '여행기록',
        short_name: '여행기록',
        description: '여행 다니면서 들른 식당·카페·장소를 기록하고, 느낀 점·쓴 돈·다음에 쓸 꿀팁을 남겨두는 나만의 여행 일지',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5f4f2',
        theme_color: '#2f7a5e',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // 동기화(Firebase) 코드는 동적 import로 분리해둔 것 — 미리 캐시하면 그 의미가 없어지므로 제외.
        globIgnores: ['**/sync-*.js'],
      },
    }),
  ],
})
