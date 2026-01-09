import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../../lib/auth-context'
import { useTRPC } from '../../integrations/trpc/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RoleGuard } from '../../components/RoleGuard'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Wallet,
  UtensilsCrossed,
  Package,
  X,
  Check,
  Loader2,
  MessageSquare,
  Send,
  Receipt,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/pos')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager', 'server', 'counter']}>
      <POSPage />
    </RoleGuard>
  ),
})

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image: string
  notes?: string
}

function POSPage() {
  const { user } = useAuth()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in')
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)

  // Fetch categories from database
  const { data: categories = [] } = useQuery(trpc.categories.list.queryOptions())

  // Fetch products from database
  const { data: products = [], isLoading: productsLoading } = useQuery(
    trpc.products.listAvailable.queryOptions()
  )

  // Fetch all tables for POS (available + occupied)
  const { data: tables = [] } = useQuery(trpc.tables.getAllForPOS.queryOptions())

  // Fetch active order for selected table
  const { data: activeOrder, refetch: refetchActiveOrder } = useQuery({
    ...trpc.tables.getActiveOrder.queryOptions({ tableId: selectedTable || 0 }),
    enabled: !!selectedTable && orderType === 'dine_in',
  })

  // Set active order ID when table is selected and has an active order
  const currentActiveOrderId = activeOrder?.id || activeOrderId

  // Create order mutation
  const createOrderMutation = useMutation(
    trpc.orders.create.mutationOptions({
      onSuccess: (newOrder) => {
        setActiveOrderId(newOrder.id)
        return newOrder
      },
    })
  )

  // Add item mutation
  const addItemMutation = useMutation(
    trpc.orders.addItem.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['tables']] })
        queryClient.invalidateQueries({ queryKey: [['orders']] })
      },
    })
  )

  // Create payment mutation
  const createPaymentMutation = useMutation(
    trpc.payments.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['orders']] })
        queryClient.invalidateQueries({ queryKey: [['tables']] })
        clearCart()
        setActiveOrderId(null)
        alert('Payment processed successfully!')
      },
    })
  )

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Cart functions
  const addToCart = (product: (typeof products)[0]) => {
    const cartContainer = document.getElementById('cart-container')
    if (cartContainer) {
        setTimeout(() => {
            cartContainer.scrollTo({ top: cartContainer.scrollHeight, behavior: 'smooth' })
        }, 300)
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          image: product.emoji || '🍽️',
          notes: '',
        },
      ]
    })
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id))
  }

  const updateNotes = (id: number, notes: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, notes } : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
    setShowPayment(false)
    setPaymentMethod(null)
  }

  const resetOrder = () => {
    clearCart()
    setSelectedTable(null)
    setActiveOrderId(null)
  }

  // Calculate totals for cart items
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const tax = subtotal * 0.1 // 10% tax
  const cartTotal = subtotal + tax

  // Calculate totals including existing order items
  const existingOrderSubtotal = activeOrder?.items?.reduce(
    (sum, item) => sum + parseFloat(item.subtotal),
    0
  ) || 0
  const existingOrderTax = existingOrderSubtotal * 0.1
  const existingOrderTotal = existingOrderSubtotal + existingOrderTax

  const grandTotal = cartTotal + existingOrderTotal

  // Send to kitchen - creates order or adds to existing order
  const handleSendToKitchen = async () => {
    if (cart.length === 0) return
    if (orderType === 'dine_in' && !selectedTable) {
      alert('Please select a table for dine-in orders')
      return
    }

    try {
      let orderId = currentActiveOrderId

      // If no active order exists for this table, create a new one
      if (!orderId) {
        const newOrder = await createOrderMutation.mutateAsync({
          orderType,
          tableId: orderType === 'dine_in' ? selectedTable || undefined : undefined,
          serverId: user?.id,
        })
        orderId = newOrder.id
      }

      // Add all cart items to the order
      for (const item of cart) {
        await addItemMutation.mutateAsync({
          orderId: orderId,
          productId: item.id,
          quantity: item.quantity,
          notes: item.notes || undefined,
          serverId: user?.id,
        })
      }

      // Refresh active order data
      await refetchActiveOrder()
      
      // Clear cart but keep table selected for adding more items
      setCart([])
      alert('Order sent to kitchen!')
    } catch (error) {
      alert('Error sending order: ' + (error as Error).message)
    }
  }

  const handlePayNow = () => {
    if (orderType === 'dine_in' && !selectedTable) {
      alert('Please select a table')
      return
    }
    if (!currentActiveOrderId && cart.length === 0) {
      alert('No items to pay for')
      return
    }
    setShowPayment(true)
  }

  const handleProcessPayment = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method')
      return
    }

    try {
      let orderId = currentActiveOrderId

      // If there are items in cart but no active order, create one first
      if (!orderId && cart.length > 0) {
        const newOrder = await createOrderMutation.mutateAsync({
          orderType,
          tableId: orderType === 'dine_in' ? selectedTable || undefined : undefined,
          serverId: user?.id,
        })
        orderId = newOrder.id

        // Add cart items
        for (const item of cart) {
          await addItemMutation.mutateAsync({
            orderId: orderId,
            productId: item.id,
            quantity: item.quantity,
            notes: item.notes || undefined,
            serverId: user?.id,
          })
        }
      } else if (orderId && cart.length > 0) {
        // Add any remaining cart items to existing order
        for (const item of cart) {
          await addItemMutation.mutateAsync({
            orderId: orderId,
            productId: item.id,
            quantity: item.quantity,
            notes: item.notes || undefined,
            serverId: user?.id,
          })
        }
      }

      if (!orderId) {
        alert('No order to pay for')
        return
      }

      // Process payment
      await createPaymentMutation.mutateAsync({
        orderId: orderId,
        amount: grandTotal.toFixed(2),
        method: paymentMethod as 'cash' | 'card' | 'digital_wallet',
        processedBy: user?.id || 1,
      })

      resetOrder()
    } catch (error) {
      alert('Error processing payment: ' + (error as Error).message)
    }
  }

  const getTableNumber = (tableId: number) => {
    const table = tables.find((t) => t.id === tableId)
    return table ? table.tableNumber : 'N/A'
  }

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search and Order Type */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            {(['dine_in', 'takeaway', 'delivery'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  orderType === type
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {type === 'dine_in'
                  ? 'Dine In'
                  : type === 'takeaway'
                    ? 'Takeaway'
                    : 'Delivery'}
              </button>
            ))}
          </div>
        </div>

        {/* Table Selection for Dine In */}
        {orderType === 'dine_in' && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Select Table {selectedTable && activeOrder && (
                <span className="text-cyan-400 ml-2">
                  (Table {getTableNumber(selectedTable)} has active order)
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              {tables.map((table) => {
                const isOccupied = table.status === 'occupied'
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => setSelectedTable(table.id)}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors relative ${
                      selectedTable === table.id
                        ? 'bg-cyan-500 text-white'
                        : isOccupied
                          ? 'bg-amber-600/30 text-amber-300 hover:bg-amber-600/50 border border-amber-500/50'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4 inline-block mr-1" />
                    {table.tableNumber}
                    {isOccupied && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 scrollbar-thin">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700/50 transition-all text-left"
              >
                <div className="text-4xl mb-2">{product.emoji || '🍽️'}</div>
                <h3 className="font-medium text-white truncate">
                  {product.name}
                </h3>
                <p className="text-cyan-400 font-bold">
                  ${parseFloat(product.price).toFixed(2)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-80 lg:w-96 bg-slate-800 rounded-xl border border-slate-700 flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-cyan-400" />
              {activeOrder ? 'Add to Order' : 'New Order'}
            </h2>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                  title="Clear cart"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              {(activeOrder || selectedTable) && (
                <button
                  type="button"
                  onClick={resetOrder}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Start new order"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          {selectedTable && orderType === 'dine_in' && (
            <p className="text-sm text-gray-400 mt-1">
              Table {getTableNumber(selectedTable)} •{' '}
              {activeOrder ? (
                <span className="text-amber-400">Active Order #{activeOrder.orderNumber}</span>
              ) : (
                'New Order'
              )}
            </p>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 scrollbar-thin" id="cart-container">
          {/* Existing order items */}
          {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                Already Ordered
              </h3>
              <div className="space-y-2">
                {activeOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-2 border border-slate-600/50"
                  >
                    <span className="text-xl">{item.productEmoji || '🍽️'}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm text-gray-300 truncate">
                        {item.productName}
                      </h4>
                      {item.notes && (
                        <p className="text-xs text-gray-500 truncate">
                          📝 {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">×{item.quantity}</span>
                      <span className="text-sm text-cyan-400/70">
                        ${parseFloat(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-600/50 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Ordered Subtotal</span>
                  <span>${existingOrderSubtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* New items to add */}
          {cart.length > 0 && (
            <div>
              {activeOrder && (
                <h3 className="text-xs font-medium text-cyan-400 uppercase mb-2">
                  New Items
                </h3>
              )}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-700/50 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.image}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {item.name}
                        </h4>
                        <p className="text-sm text-cyan-400">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-full bg-slate-600 text-white hover:bg-slate-500 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center text-white font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-full bg-slate-600 text-white hover:bg-slate-500 flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-full text-gray-400 hover:text-red-400 flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Notes input for kitchen */}
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Add note for kitchen..."
                        value={item.notes || ''}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="flex-1 bg-slate-600/50 border-0 rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {cart.length === 0 && !activeOrder && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
              <p>Cart is empty</p>
              <p className="text-sm">Add items to get started</p>
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          <div className="space-y-2 text-sm">
            {cart.length > 0 && (
              <>
                <div className="flex justify-between text-gray-400">
                  <span>New Items</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </>
            )}
            {activeOrder && (
              <div className="flex justify-between text-gray-400">
                <span>Previous Order</span>
                <span>${existingOrderTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-slate-700">
              <span>Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {!showPayment ? (
            <div className="space-y-2">
              {/* Send to Kitchen button */}
              <Button
                onClick={handleSendToKitchen}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-3"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Kitchen
              </Button>
              
              {/* Pay Now button - only show when there's something to pay */}
              {(activeOrder || cart.length > 0) && (
                <Button
                  onClick={handlePayNow}
                  variant="outline"
                  className="w-full border-green-500/50 text-green-400 hover:bg-green-500/20 hover:text-green-300 font-semibold py-3"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Pay Now ${grandTotal.toFixed(2)}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400">
                Select Payment Method
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', icon: Banknote, label: 'Cash' },
                  { id: 'card', icon: CreditCard, label: 'Card' },
                  { id: 'digital', icon: Wallet, label: 'Digital' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === method.id
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-xs">{method.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPayment(false)}
                  className="flex-1 border-slate-600"
                >
                  Back
                </Button>
                <Button
                  onClick={handleProcessPayment}
                  disabled={!paymentMethod}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Pay ${grandTotal.toFixed(2)}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
