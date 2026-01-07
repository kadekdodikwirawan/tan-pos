import type { AuthUser } from './auth-store'

// Demo users for the POS system
export const demoUsers: Record<string, { password: string; user: AuthUser }> = {
  admin: {
    password: 'admin123',
    user: {
      id: 1,
      username: 'admin',
      fullName: 'System Administrator',
      role: 'admin',
      email: 'admin@restaurant.com',
    },
  },
  manager1: {
    password: 'admin123',
    user: {
      id: 2,
      username: 'manager1',
      fullName: 'John Manager',
      role: 'manager',
      email: 'manager@restaurant.com',
    },
  },
  server1: {
    password: 'admin123',
    user: {
      id: 3,
      username: 'server1',
      fullName: 'Sarah Server',
      role: 'server',
      email: 'server1@restaurant.com',
    },
  },
  server2: {
    password: 'admin123',
    user: {
      id: 4,
      username: 'server2',
      fullName: 'Mike Waiter',
      role: 'server',
      email: 'server2@restaurant.com',
    },
  },
  counter1: {
    password: 'admin123',
    user: {
      id: 5,
      username: 'counter1',
      fullName: 'Emily Cashier',
      role: 'counter',
      email: 'counter1@restaurant.com',
    },
  },
  counter2: {
    password: 'admin123',
    user: {
      id: 6,
      username: 'counter2',
      fullName: 'David Counter',
      role: 'counter',
      email: 'counter2@restaurant.com',
    },
  },
  kitchen1: {
    password: 'admin123',
    user: {
      id: 7,
      username: 'kitchen1',
      fullName: 'Chef Gordon',
      role: 'kitchen',
      email: 'kitchen@restaurant.com',
    },
  },
}

// Simple authentication function (demo purposes)
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const userRecord = demoUsers[username.toLowerCase()]

  if (!userRecord) {
    return { success: false, error: 'User not found' }
  }

  if (userRecord.password !== password) {
    return { success: false, error: 'Invalid password' }
  }

  return { success: true, user: userRecord.user }
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
