import { Store } from '@tanstack/store'

export type UserRole = 'admin' | 'manager' | 'server' | 'counter' | 'kitchen'

export interface AuthUser {
  id: number
  username: string
  fullName: string
  role: UserRole
  email?: string | null
  phone?: string | null
}

export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
}

export const authStore = new Store<AuthState>(initialState)

// Auth actions
export const authActions = {
  login: (user: AuthUser) => {
    authStore.setState(() => ({
      user,
      isAuthenticated: true,
      isLoading: false,
    }))
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_auth_user', JSON.stringify(user))
    }
  },

  logout: () => {
    authStore.setState(() => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }))
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_auth_user')
    }
  },

  setLoading: (isLoading: boolean) => {
    authStore.setState((state) => ({
      ...state,
      isLoading,
    }))
  },

  initializeAuth: () => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('pos_auth_user')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser) as AuthUser
          authStore.setState(() => ({
            user,
            isAuthenticated: true,
            isLoading: false,
          }))
        } catch {
          authStore.setState(() => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }))
        }
      } else {
        authStore.setState((state) => ({
          ...state,
          isLoading: false,
        }))
      }
    }
  },
}

// Role-based access helpers
export const rolePermissions: Record<UserRole, string[]> = {
  admin: ['*'], // Full access
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

export const hasPermission = (role: UserRole, permission: string): boolean => {
  const permissions = rolePermissions[role]
  if (permissions.includes('*')) return true
  if (permissions.includes(permission)) return true

  // Check for wildcard permissions (e.g., 'orders' includes 'orders:view')
  const [category] = permission.split(':')
  if (permissions.includes(category)) return true

  return false
}

export const canAccessRoute = (role: UserRole, route: string): boolean => {
  const routePermissions: Record<string, string[]> = {
    '/dashboard': ['admin', 'manager'],
    '/dashboard/pos': ['admin', 'manager', 'server', 'counter'],
    '/dashboard/kitchen': ['admin', 'manager', 'kitchen'],
    '/dashboard/orders': ['admin', 'manager', 'server', 'counter'],
    '/dashboard/tables': ['admin', 'manager', 'server'],
    '/dashboard/products': ['admin', 'manager'],
    '/dashboard/categories': ['admin', 'manager'],
    '/dashboard/staff': ['admin'],
    '/dashboard/reports': ['admin', 'manager'],
    '/dashboard/payments': ['admin', 'manager', 'counter'],
    '/dashboard/settings': ['admin'],
  }

  const allowedRoles = routePermissions[route]
  if (!allowedRoles) return true // If no permission defined, allow access
  return allowedRoles.includes(role)
}
