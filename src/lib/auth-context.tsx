import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useStore } from '@tanstack/react-store'
import {
  authStore,
  authActions,
  type AuthUser,
  type UserRole,
  canAccessRoute,
} from './auth-store'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: AuthUser) => void
  logout: () => void
  canAccess: (route: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useStore(authStore, (state) => state.user)
  const isAuthenticated = useStore(authStore, (state) => state.isAuthenticated)
  const isLoading = useStore(authStore, (state) => state.isLoading)

  useEffect(() => {
    authActions.initializeAuth()
  }, [])

  const canAccess = (route: string): boolean => {
    if (!user) return false
    return canAccessRoute(user.role, route)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login: authActions.login,
    logout: authActions.logout,
    canAccess,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for checking specific permissions
export function usePermission(permission: string): boolean {
  const { user } = useAuth()
  if (!user) return false

  const rolePermissions: Record<UserRole, string[]> = {
    admin: ['*'],
    manager: [
      'dashboard',
      'orders',
      'tables',
      'products',
      'categories',
      'reports',
      'staff:view',
    ],
    server: ['pos', 'orders:own', 'tables'],
    counter: ['pos', 'orders', 'payments'],
    kitchen: ['kitchen', 'orders:view'],
  }

  const permissions = rolePermissions[user.role]
  if (permissions.includes('*')) return true
  if (permissions.includes(permission)) return true

  const [category] = permission.split(':')
  if (permissions.includes(category)) return true

  return false
}
