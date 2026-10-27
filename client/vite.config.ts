import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Fonts are discovered only after the stylesheet parses; preloading the latin
// subsets (the only ones this UI needs) starts their download with the CSS.
function preloadLatinFonts(): Plugin {
  return {
    name: 'preload-latin-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const urls = Object.keys(ctx.bundle ?? {})
          .filter((file) => /noto-sans-latin-wght-normal|raleway-latin-wght-normal/.test(file))
          .map((file) => `/${file}`)
        if (!urls.length) return html

        const links = urls
          .map((url) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${url}" />`)
          .join('\n    ')
        return html.replace('</head>', `    ${links}\n  </head>`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), preloadLatinFonts()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // your backend
        changeOrigin: true,
        // secure: false, // uncomment if backend uses self-signed HTTPS
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
