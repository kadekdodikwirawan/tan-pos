import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { trpcRouter } from './src/integrations/trpc/router'

const config = defineConfig({
  plugins: [
    devtools(),
    netlify(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    {
      name: 'trpc-middleware',
      configureServer(server) {
        server.middlewares.use('/api/trpc', async (req, res) => {
          // Convert Node request to Fetch Request
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
          }
          
          let body: string | undefined
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            body = await new Promise<string>((resolve) => {
              let data = ''
              req.on('data', (chunk) => (data += chunk))
              req.on('end', () => resolve(data))
            })
          }
          
          // req.url is relative to mount point, so we need to prepend /api/trpc
          const fullUrl = `http://${req.headers.host}/api/trpc${req.url}`
          
          const request = new Request(fullUrl, {
            method: req.method,
            headers,
            body: body || undefined,
          })
          
          const response = await fetchRequestHandler({
            endpoint: '/api/trpc',
            req: request,
            router: trpcRouter,
            createContext: () => ({}),
          })
          
          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            res.setHeader(key, value)
          })
          
          const responseBody = await response.text()
          res.end(responseBody)
        })
      },
    },
  ],
})

export default config
