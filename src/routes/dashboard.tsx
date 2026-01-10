import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../lib/auth-context'
import { getRoleDisplayName, getRoleColor } from '../lib/auth'
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  ClipboardList,
  UtensilsCrossed,
  Users,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  // Navigation items based on role
  const getNavItems = () => {
    const allItems = [
      {
        to: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        roles: ['admin', 'manager'],
      },
      {
        to: '/dashboard/pos',
        icon: ShoppingCart,
        label: 'POS',
        roles: ['admin', 'manager', 'server', 'counter'],
      },
      {
        to: '/dashboard/kitchen',
        icon: ChefHat,
        label: 'Kitchen',
        roles: ['admin', 'manager', 'kitchen'],
      },
      {
        to: '/dashboard/orders',
        icon: ClipboardList,
        label: 'Orders',
        roles: ['admin', 'manager', 'server', 'counter'],
      },
      {
        to: '/dashboard/tables',
        icon: UtensilsCrossed,
        label: 'Tables',
        roles: ['admin', 'manager', 'server'],
      },
      {
        to: '/dashboard/products',
        icon: Store,
        label: 'Products',
        roles: ['admin', 'manager'],
      },
      {
        to: '/dashboard/staff',
        icon: Users,
        label: 'Staff',
        roles: ['admin'],
      },
      {
        to: '/dashboard/reports',
        icon: FileText,
        label: 'Reports',
        roles: ['admin', 'manager'],
      },
      {
        to: '/dashboard/payments',
        icon: CreditCard,
        label: 'Payments',
        roles: ['admin', 'manager', 'counter'],
      },
      {
        to: '/dashboard/settings',
        icon: Settings,
        label: 'Settings',
        roles: ['admin'],
      },
    ]

    return allItems.filter((item) => item.roles.includes(user.role))
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-slate-800 border-r border-slate-700 transform transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? 'lg:w-20' : 'w-64'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-slate-700">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-lg font-bold text-white">TanStack POS</h1>
                  <p className="text-xs text-gray-400">Restaurant Management</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 space-y-1 overflow-y-auto ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === '/dashboard' }}
                className={`flex items-center rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-colors ${
                  sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                }`}
                activeProps={{
                  className: `flex items-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 ${
                    sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                  }`,
                }}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* User info and logout */}
          <div className={`border-t border-slate-700 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            {/* Desktop collapse button */}
            <button
              type="button"
              className="hidden lg:flex w-full items-center justify-center p-2 mb-3 rounded-lg text-gray-400 hover:bg-slate-700 hover:text-white transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
            
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {user.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.fullName}
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs text-white ${getRoleColor(user.role)}`}
                  >
                    {getRoleDisplayName(user.role)}
                  </span>
                </div>
              </div>
            )}
            
            {sidebarCollapsed ? (
              <button
                type="button"
                className="w-full flex items-center justify-center p-3 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                onClick={handleLogout}
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 bg-slate-700/50 border-slate-600 text-gray-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-4 lg:px-6">
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:bg-slate-700 hover:text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <div className="flex-1 flex items-center justify-between ml-4 lg:ml-0">
            <h2 className="text-lg font-semibold text-white">
              Welcome back, {user.fullName.split(' ')[0]}!
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
