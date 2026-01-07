import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '../../integrations/trpc/react'
import { RoleGuard } from '../../components/RoleGuard'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Search,
  Eye,
  Printer,
  DollarSign,
  CreditCard,
  Banknote,
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Loader2,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/payments')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager', 'counter']}>
      <PaymentsPage />
    </RoleGuard>
  ),
})

type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled'
type PaymentMethod = 'cash' | 'card' | 'digital_wallet'

function PaymentsPage() {
  const trpc = useTRPC()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all')

  // Fetch payments from database
  const { data: payments = [], isLoading } = useQuery(trpc.payments.list.queryOptions())

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch =
        payment.paymentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.processedByName?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
      const matchesMethod = methodFilter === 'all' || payment.method === methodFilter
      return matchesSearch && matchesStatus && matchesMethod
    })
  }, [payments, searchQuery, statusFilter, methodFilter])

  // Calculate totals
  const totals = useMemo(() => ({
    paid: payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0),
    pending: payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0),
    refunded: payments
      .filter((p) => p.status === 'refunded')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0),
  }), [payments])

  // Get method icon
  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return Banknote
      case 'card':
        return CreditCard
      case 'digital_wallet':
        return Wallet
    }
  }

  // Get status styling
  const getStatusStyle = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle }
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock }
      case 'refunded':
        return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: RefreshCw }
      case 'cancelled':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle }
    }
  }

  // Format time
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    const minutes = Math.floor((Date.now() - d.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return d.toLocaleDateString()
  }

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
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-gray-400">Manage and track all payments</p>
        </div>
        <Button variant="outline" className="border-slate-700 text-gray-300">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl p-6 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Paid</p>
              <p className="text-2xl font-bold text-green-400">
                ${totals.paid.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">
                ${totals.pending.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Refunded</p>
              <p className="text-2xl font-bold text-blue-400">
                ${totals.refunded.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search by payment ID, order ID, or staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | 'all')}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="digital_wallet">Digital Wallet</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Payment ID
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Order
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Amount
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Method
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Processed By
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Time
                </th>
                <th className="text-right p-4 text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredPayments.map((payment) => {
                const statusStyle = getStatusStyle(payment.status)
                const StatusIcon = statusStyle.icon
                const MethodIcon = getMethodIcon(payment.method)

                return (
                  <tr
                    key={payment.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-medium text-white">{payment.paymentNumber}</span>
                      {payment.transactionId && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {payment.transactionId}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-cyan-400">{payment.orderNumber || `#${payment.orderId}`}</td>
                    <td className="p-4">
                      <span className="font-bold text-white">
                        ${parseFloat(payment.amount || '0').toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-300">
                        <MethodIcon className="w-4 h-4" />
                        <span className="text-sm capitalize">
                          {payment.method.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${statusStyle.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">{payment.processedByName || 'Unknown'}</td>
                    <td className="p-4 text-gray-400 text-sm">
                      {payment.createdAt ? formatTime(payment.createdAt) : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <DollarSign className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg">No payments found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
