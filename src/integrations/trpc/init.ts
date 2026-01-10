import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { auth } from '../../lib/auth-server'

// Context type for tRPC
export interface TRPCContext {
  user: {
    id: string
    email: string
    name: string
    role: string
  } | null
  session: {
    id: string
    token: string
  } | null
}

// Create context from request
export async function createContext(request: Request): Promise<TRPCContext> {
  const session = await auth.api.getSession({ headers: request.headers })
  
  if (!session) {
    return { user: null, session: null }
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: (session.user as any).role || 'server',
    },
    session: {
      id: session.session.id,
      token: session.session.token,
    },
  }
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router

// Public procedure - still requires authentication
export const publicProcedure = t.procedure

// Protected procedure - requires authenticated user
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session!,
    },
  })
})

// Admin procedure - requires admin role
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be an admin to access this resource',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session!,
    },
  })
})
