import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../lib/auth-context'
import { Button } from './ui/button'
import { ShieldX } from 'lucide-react'

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldX className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400 mb-4">You don't have permission to access this page.</p>
        <Button 
          onClick={() => navigate({ to: '/dashboard' })} 
          className="bg-cyan-500 hover:bg-cyan-600"
        >
          Go to Dashboard
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
