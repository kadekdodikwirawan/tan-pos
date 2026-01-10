import { createFileRoute } from '@tanstack/react-router'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { trpcRouter } from '@/integrations/trpc/router'
import { createContext } from '@/integrations/trpc/init'

const handler = async ({ request }: { request: Request }) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: trpcRouter,
    createContext: () => createContext(request),
    onError: ({ path, error }) => {
      console.error(`tRPC failed on path ${path}: ${error.message}`)
    },
  })

export const Route = createFileRoute('/api/trpc/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
})
