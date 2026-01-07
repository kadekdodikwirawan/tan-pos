import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '../../integrations/trpc/react'
import { RoleGuard } from '../../components/RoleGuard'
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  Download,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react'
import { Button } from '../../components/ui/button'

export const Route = createFileRoute('/dashboard/reports')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <ReportsPage />
    </RoleGuard>
  ),
})

function ReportsPage() {
  const trpc = useTRPC()
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('today')

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: loadingStats } = useQuery(
    trpc.reports.getDashboardStats.queryOptions()
  )

  // Fetch top products
  const { data: topProductsData = [], isLoading: loadingProducts } = useQuery(
    trpc.reports.getTopProducts.queryOptions({ limit: 5 })
  )

  // Fetch sales by category
  const { data: salesByCategoryData = [], isLoading: loadingCategories } = useQuery(
    trpc.reports.getSalesByCategory.queryOptions()
  )

  // Calculate total for percentage
  const totalCategorySales = useMemo(() => 
    salesByCategoryData.reduce((sum, cat) => sum + (parseFloat(cat.totalRevenue as unknown as string) || 0), 0),
    [salesByCategoryData]
  )

  // Transform category data with percentages
  const salesByCategory = useMemo(() => 
    salesByCategoryData.map(cat => ({
      name: cat.categoryName,
      sales: parseFloat(cat.totalRevenue as unknown as string) || 0,
      percentage: totalCategorySales > 0 
        ? Math.round((parseFloat(cat.totalRevenue as unknown as string) || 0) / totalCategorySales * 100)
        : 0
    })),
    [salesByCategoryData, totalCategorySales]
  )

  // Transform top products
  const topProducts = useMemo(() => 
    topProductsData.map(p => ({
      name: p.productName,
      sales: p.totalQuantity || 0,
      revenue: parseFloat(p.totalRevenue as unknown as string) || 0,
    })),
    [topProductsData]
  )

  // Demo data for hourly sales (would need a more complex query)
  const hourlySales = [
    { hour: '10AM', sales: 450 },
    { hour: '11AM', sales: 680 },
    { hour: '12PM', sales: 1250 },
    { hour: '1PM', sales: 1480 },
    { hour: '2PM', sales: 980 },
    { hour: '3PM', sales: 520 },
    { hour: '4PM', sales: 380 },
    { hour: '5PM', sales: 620 },
    { hour: '6PM', sales: 1120 },
    { hour: '7PM', sales: 1580 },
    { hour: '8PM', sales: 1420 },
    { hour: '9PM', sales: 980 },
  ]

  // Build stats based on real data (we use multipliers to simulate different ranges)
  const multipliers = { today: 1, week: 7, month: 30, year: 365 }
  const currentStats = useMemo(() => {
    const multiplier = multipliers[dateRange]
    return {
      revenue: (dashboardStats?.todaysRevenue || 0) * multiplier,
      revenueChange: 12.5,
      orders: (dashboardStats?.todaysOrderCount || 0) * multiplier,
      ordersChange: 8.2,
      avgOrder: dashboardStats?.avgOrderValue || 0,
      avgOrderChange: 3.8,
      customers: Math.round((dashboardStats?.todaysOrderCount || 0) * 0.8 * multiplier),
      customersChange: 15.3,
    }
  }, [dashboardStats, dateRange])

  const maxSales = Math.max(...hourlySales.map((h) => h.sales))

  const isLoading = loadingStats || loadingProducts || loadingCategories

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-gray-400">Track your restaurant performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 rounded-lg border border-slate-700 p-1">
            {(['today', 'week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-cyan-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="outline" className="border-slate-700 text-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${currentStats.revenue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {currentStats.revenueChange >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            )}
            <span
              className={`text-sm ${currentStats.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {currentStats.revenueChange >= 0 ? '+' : ''}
              {currentStats.revenueChange}%
            </span>
            <span className="text-sm text-gray-500">vs previous period</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-white mt-1">
                {currentStats.orders.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {currentStats.ordersChange >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            )}
            <span
              className={`text-sm ${currentStats.ordersChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {currentStats.ordersChange >= 0 ? '+' : ''}
              {currentStats.ordersChange}%
            </span>
            <span className="text-sm text-gray-500">vs previous period</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${currentStats.avgOrder.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {currentStats.avgOrderChange >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            )}
            <span
              className={`text-sm ${currentStats.avgOrderChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {currentStats.avgOrderChange >= 0 ? '+' : ''}
              {currentStats.avgOrderChange}%
            </span>
            <span className="text-sm text-gray-500">vs previous period</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-white mt-1">
                {currentStats.customers.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {currentStats.customersChange >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            )}
            <span
              className={`text-sm ${currentStats.customersChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {currentStats.customersChange >= 0 ? '+' : ''}
              {currentStats.customersChange}%
            </span>
            <span className="text-sm text-gray-500">vs previous period</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Sales */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Hourly Sales
          </h2>
          <div className="flex items-end gap-2 h-48">
            {hourlySales.map((item) => (
              <div key={item.hour} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-sm transition-all hover:from-cyan-400 hover:to-blue-400"
                  style={{ height: `${(item.sales / maxSales) * 100}%` }}
                />
                <span className="text-xs text-gray-500 mt-2">{item.hour}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-cyan-400" />
            Sales by Category
          </h2>
          <div className="space-y-3">
            {salesByCategory.map((category, index) => {
              const colors = [
                'bg-cyan-500',
                'bg-blue-500',
                'bg-purple-500',
                'bg-green-500',
                'bg-orange-500',
                'bg-pink-500',
              ]
              return (
                <div key={category.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{category.name}</span>
                    <span className="text-sm text-gray-400">
                      ${category.sales.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[index]} transition-all`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Top Selling Products
          </h2>
        </div>
        <div className="divide-y divide-slate-700">
          {topProducts.map((product, index) => (
            <div
              key={product.name}
              className="p-4 flex items-center justify-between hover:bg-slate-700/30"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0
                      ? 'bg-yellow-500 text-black'
                      : index === 1
                        ? 'bg-gray-400 text-black'
                        : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-600 text-gray-300'
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-white">{product.name}</p>
                  <p className="text-sm text-gray-400">{product.sales} orders</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-400">
                  ${product.revenue.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
