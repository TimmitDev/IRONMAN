import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' + HashRouter: werkt op https://<user>.github.io/<repo>/ ongeacht de reponaam.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
