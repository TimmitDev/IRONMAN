import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' + HashRouter: werkt op https://<user>.github.io/<repo>/ ongeacht de reponaam.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Libraries in eigen chunks: ze laden parallel en blijven na een deploy in de cache,
        // omdat alleen de (kleine) app-chunks een nieuwe hash krijgen.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 2 },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
})
