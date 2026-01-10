import type { AuthUser, UserRole } from './auth-store'

// Demo accounts info (for display purposes only, auth happens via database)
export const demoAccounts = [
  {
    role: 'admin' as UserRole,
    username: 'admin',
    description: 'Full system access',
  },
  {
    role: 'manager' as UserRole,
    username: 'manager1',
    description: 'Business operations',
  },
  {
    role: 'server' as UserRole,
    username: 'server1',
    description: 'Dine-in orders',
  },
  {
    role: 'counter' as UserRole,
    username: 'counter1',
    description: 'Orders + payments',
  },
  {
    role: 'kitchen' as UserRole,
    username: 'kitchen1',
    description: 'Order preparation',
  },
]

// Transform database user to AuthUser
export function transformToAuthUser(dbUser: {
  id: number | string
  username: string
  fullName: string
  role: string
  email: string | null
  phone: string | null
}): AuthUser {
  return {
    id: String(dbUser.id),
    username: dbUser.username,
    fullName: dbUser.fullName,
    role: dbUser.role as UserRole,
    email: dbUser.email,
    phone: dbUser.phone,
  }
}

// Get route for role after login
export function getDefaultRouteForRole(role: UserRole): string {
  const roleRoutes: Record<UserRole, string> = {
    admin: '/dashboard',
    manager: '/dashboard',
    server: '/dashboard/pos',
    counter: '/dashboard/pos',
    kitchen: '/dashboard/kitchen',
  }
  return roleRoutes[role] || '/dashboard'
}

// Get role display name
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    server: 'Server',
    counter: 'Counter Staff',
    kitchen: 'Kitchen Staff',
  }
  return roleNames[role] || role
}

// Get role color for badges
export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    admin: 'bg-red-500',
    manager: 'bg-purple-500',
    server: 'bg-blue-500',
    counter: 'bg-green-500',
    kitchen: 'bg-orange-500',
  }
  return roleColors[role] || 'bg-gray-500'
}
