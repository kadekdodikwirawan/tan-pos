import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTRPC } from '../../integrations/trpc/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth-context'
import { RoleGuard } from '../../components/RoleGuard'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Search,
  Eye,
  Printer,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChefHat,
  UtensilsCrossed,
  Truck,
  ShoppingBag,
  Loader2,
  CreditCard,
  Banknote,
  Wallet,
  Check,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/orders')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager', 'server', 'counter']}>
      <OrdersPage />
    </RoleGuard>
  ),
})

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'

function OrdersPage() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'delivery'>('all')
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)

  // Fetch orders from database
  const { data: ordersData = [], isLoading } = useQuery(trpc.orders.list.queryOptions())

  // Fetch selected order details
  const { data: selectedOrder, refetch: refetchOrder } = useQuery({
    ...trpc.orders.getById.queryOptions({ id: selectedOrderId! }),
    enabled: !!selectedOrderId,
  })

  // Fetch payment for selected order
  const { data: orderPayments = [] } = useQuery({
    ...trpc.payments.getByOrderId.queryOptions({ orderId: selectedOrderId! }),
    enabled: !!selectedOrderId,
  })

  // Check if order is paid
  const isPaid = orderPayments.some((p) => p.status === 'paid')

  // Create payment mutation
  const createPaymentMutation = useMutation(
    trpc.payments.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['orders']] })
        queryClient.invalidateQueries({ queryKey: [['payments']] })
        queryClient.invalidateQueries({ queryKey: [['tables']] })
        refetchOrder()
        setPaymentMethod(null)
        alert('Payment processed successfully!')
      },
    })
  )

  // Transform orders data
  const orders = ordersData.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    table: order.tableNumber || (order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'),
    orderType: order.orderType as 'dine_in' | 'takeaway' | 'delivery',
    status: order.status as OrderStatus,
    server: order.serverName || 'Unknown',
    itemCount: 0, // Will be updated from detail view
    subtotal: parseFloat(order.subtotal || '0'),
    tax: parseFloat(order.taxAmount || '0'),
    total: parseFloat(order.total || '0'),
    isPaid: order.isPaid,
    createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
  }))

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.server.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesType = typeFilter === 'all' || order.orderType === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  // Handle payment processing
  const handleProcessPayment = async () => {
    if (!paymentMethod || !selectedOrder) {
      alert('Please select a payment method')
      return
    }

    try {
      await createPaymentMutation.mutateAsync({
        orderId: selectedOrder.id,
        amount: selectedOrder.total || '0',
        method: paymentMethod as 'cash' | 'card' | 'digital_wallet',
        processedBy: user?.id || '',
      })
    } catch (error) {
      alert('Error processing payment: ' + (error as Error).message)
    }
  }

  // Close modal and reset state
  const closeModal = () => {
    setSelectedOrderId(null)
    setPaymentMethod(null)
  }

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertCircle }
      case 'preparing':
        return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: ChefHat }
      case 'ready':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle }
      case 'served':
        return { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: UtensilsCrossed }
      case 'completed':
        return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: CheckCircle }
      case 'cancelled':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle }
      case 'paid':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Check }
      case 'unpaid':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle }
      default:
        return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: AlertCircle }
    }
  }

  // Get order type icon
  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'dine_in':
        return UtensilsCrossed
      case 'takeaway':
        return ShoppingBag
      case 'delivery':
        return Truck
      default:
        return UtensilsCrossed
    }
  }

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-gray-400">Manage and track all orders</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {filteredOrders.length} orders
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search by order #, table, or server..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Types</option>
            <option value="dine_in">Dine In</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-hidden bg-slate-800 rounded-xl border border-slate-700">
        <div className="overflow-x-auto h-full">
          <table className="w-full">
            <thead className="bg-slate-700/50 sticky top-0">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Order
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Type
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Table
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Server
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Items
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Total
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
              {filteredOrders.map((order) => {
                const TypeIcon = getOrderTypeIcon(order.orderType)

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="p-4">
                      <span className="font-medium text-white">
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-300">
                        <TypeIcon className="w-4 h-4" />
                        <span className="text-sm capitalize">
                          {order.orderType.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">{order.table}</td>
                    <td className="p-4 text-gray-300">{order.server}</td>
                    <td className="p-4">
                      {(() => {
                        const paymentStatus = order.isPaid ? 'paid' : 'unpaid'
                        const { color, icon: StatusIcon } = getStatusStyle(paymentStatus)
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {order.isPaid ? 'paid' : 'unpaid'}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="p-4 text-gray-300">{order.itemCount}</td>
                    <td className="p-4">
                      <span className="font-medium text-white">
                        ${order.total.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock className="w-4 h-4" />
                        {formatTimeAgo(order.createdAt)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
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

          {filteredOrders.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <Search className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg">No orders found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedOrder.orderNumber}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {selectedOrder.tableNumber || 'No table'} •{' '}
                    {selectedOrder.orderType.replace('_', ' ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Server</span>
                <span className="text-white">{selectedOrder.serverName || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Created</span>
                <span className="text-white">
                  {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : '-'}
                </span>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="font-medium text-white mb-3">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => { 
                    const statusStyle = getStatusStyle(item.status)
                    const StatusIcon = statusStyle.icon
                      return (
                      <div className='border-b border-slate-700/50 last:border-0'>
                        <div
                          key={item.id}
                          className="flex justify-between text-sm py-2"
                        >
                          <div className="text-gray-300">
                            <span className='mr-2'>{item.quantity}x {item.name}</span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${statusStyle.color}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {item.status.charAt(0).toUpperCase() +
                                item.status.slice(1)}
                            </span>
                          </div>
                          <span className="text-white">
                            ${parseFloat(item.subtotal).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-gray-400 text-xs italic mb-2">{item.serverName}</div>
                      </div>
                    )}
                  )}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">
                    ${parseFloat(selectedOrder.subtotal || '0').toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tax (10%)</span>
                  <span className="text-white">
                    ${parseFloat(selectedOrder.taxAmount || '0').toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-700">
                  <span className="text-white">Total</span>
                  <span className="text-cyan-400">
                    ${parseFloat(selectedOrder.total || '0').toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Section */}
              {isPaid ? (
                <div className="mt-4 p-3 bg-green-500/20 rounded-lg border border-green-500/30 flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-green-400 font-medium">Payment Completed</div>
                    <div className="text-green-400/70 text-sm">
                    {orderPayments?.[0]?.method?.replace('_', ' ').toUpperCase()} • {new Date(orderPayments?.[0]?.createdAt || '').toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="text-gray-400 text-sm font-medium">Payment Method</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', icon: Banknote, label: 'Cash' },
                      { id: 'card', icon: CreditCard, label: 'Card' },
                      { id: 'digital_wallet', icon: Wallet, label: 'Digital' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === method.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                            : 'bg-slate-700/50 border-slate-600 text-gray-400 hover:border-slate-500'
                        }`}
                      >
                        <method.icon className="w-5 h-5" />
                        <span className="text-xs">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600"
                onClick={closeModal}
              >
                Close
              </Button>
              {isPaid ? (
                <Button className="flex-1 bg-cyan-500 hover:bg-cyan-600">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
              ) : (
                <Button 
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50"
                  disabled={!paymentMethod || createPaymentMutation.isPending}
                  onClick={handleProcessPayment}
                >
                  {createPaymentMutation.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Process Payment
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
