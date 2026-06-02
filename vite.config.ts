import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Sépare les dépendances stables et volumineuses du code applicatif :
        // meilleur cache navigateur entre déploiements + chargement parallèle.
        // (supabase garde son propre chunk via son import() dynamique.)
        manualChunks(id: string): string | undefined {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
            return 'vendor-react'
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion'))
            return 'vendor-motion'
          if (id.includes('radix-ui')) return 'vendor-radix'
          return undefined
        },
      },
    },
  },
})
