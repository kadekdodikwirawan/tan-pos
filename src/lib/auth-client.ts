import { createAuthClient } from 'better-auth/react'
import { usernameClient, adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient(),
  ],
})

// Export commonly used hooks and methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient

// Export admin methods for staff management
export const { admin } = authClient
