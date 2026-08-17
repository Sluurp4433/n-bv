import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' gör bygget oberoende av repo-namn på GitHub Pages.
// Tillsammans med HashRouter fungerar deep links och omladdningar utan 404-fallback.
export default defineConfig({
  base: './',
  plugins: [react()],
})
