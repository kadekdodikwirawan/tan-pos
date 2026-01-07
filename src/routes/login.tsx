import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { authenticateUser, getRoleDisplayName } from '../lib/auth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  UtensilsCrossed,
  Lock,
  User,
  AlertCircle,
  Loader2,
  ChefHat,
  CreditCard,
  Users,
  LayoutDashboard,
} from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    navigate({ to: '/dashboard' })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await authenticateUser(username, password)

      if (result.success && result.user) {
        login(result.user)
        // Redirect based on role
        const roleRoutes: Record<string, string> = {
          admin: '/dashboard',
          manager: '/dashboard',
          server: '/dashboard/pos',
          counter: '/dashboard/pos',
          kitchen: '/dashboard/kitchen',
        }
        navigate({ to: roleRoutes[result.user.role] || '/dashboard' })
      } else {
        setError(result.error || 'Login failed')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const demoAccounts = [
    {
      role: 'admin',
      username: 'admin',
      icon: LayoutDashboard,
      description: 'Full system access',
    },
    {
      role: 'manager',
      username: 'manager1',
      icon: Users,
      description: 'Business operations',
    },
    {
      role: 'server',
      username: 'server1',
      icon: UtensilsCrossed,
      description: 'Dine-in orders',
    },
    {
      role: 'counter',
      username: 'counter1',
      icon: CreditCard,
      description: 'Orders + payments',
    },
    {
      role: 'kitchen',
      username: 'kitchen1',
      icon: ChefHat,
      description: 'Order preparation',
    },
  ]

  const fillDemoAccount = (demoUsername: string) => {
    setUsername(demoUsername)
    setPassword('admin123')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8">
        {/* Login Form */}
        <div className="flex-1 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mb-4">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              TanStack POS
            </h1>
            <p className="text-gray-400">Restaurant Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/25"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="flex-1 bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
          <h2 className="text-xl font-semibold text-white mb-2">
            Demo Accounts
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Click any account below to auto-fill credentials
          </p>

          <div className="space-y-3">
            {demoAccounts.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => fillDemoAccount(account.username)}
                className="w-full flex items-center gap-4 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl border border-slate-600/50 hover:border-cyan-500/50 transition-all duration-200 group"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 group-hover:from-cyan-600 group-hover:to-blue-700 transition-all duration-200">
                  <account.icon className="w-6 h-6 text-gray-300 group-hover:text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {account.username}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-600 text-gray-300">
                      {getRoleDisplayName(account.role)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{account.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <p className="text-cyan-400 text-sm">
              <strong>All demo passwords:</strong> admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
