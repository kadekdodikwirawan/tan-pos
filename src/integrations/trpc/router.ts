import { z } from 'zod'
import { eq, desc, and, gte, lte, sql, ne, or } from 'drizzle-orm'
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from './init'
import { db } from '../../db'
import {
  users,
  categories,
  products,
  tables,
  orders,
  orderItems,
  payments,
  settings,
} from '../../db/schema'
import type { TRPCRouterRecord } from '@trpc/server'

// =====================================================
// USERS ROUTER (Admin only)
// =====================================================
const usersRouter = {
  list: protectedProcedure.query(async () => {
    return db.select().from(users).orderBy(users.username)
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await db.select().from(users).where(eq(users.id, input.id))
      return result[0] || null
    }),

  getByUsername: protectedProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
      return result[0] || null
    }),

  // Note: Authentication is now handled by better-auth at /api/auth/*
  // This legacy endpoint is kept for backward compatibility
  authenticate: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async () => {
      // This is deprecated - use better-auth signIn.username() instead
      return { success: false, error: 'Use /api/auth/sign-in/username endpoint' }
    }),

  // Note: User creation is now handled by better-auth admin API
  // Use authClient.admin.createUser() instead
  // This endpoint is deprecated
  create: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        username: z.string(),
        email: z.string(),
        fullName: z.string(),
        role: z.enum(['admin', 'manager', 'server', 'counter', 'kitchen']),
        phone: z.string().optional(),
      })
    )
    .mutation(async () => {
      // Deprecated - use better-auth admin.createUser() instead
      return { error: 'Use better-auth admin.createUser() API' }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        fullName: z.string().optional(),
        role: z.enum(['admin', 'manager', 'server', 'counter', 'kitchen']).optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const result = await db.update(users).set(data).where(eq(users.id, id)).returning()
      return result[0]
    }),

  // Note: User deletion is now handled by better-auth admin API
  // Use authClient.admin.removeUser() instead
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      // Deprecated - use better-auth admin.removeUser() instead
      return { error: 'Use better-auth admin.removeUser() API' }
    }),
} satisfies TRPCRouterRecord

// =====================================================
// CATEGORIES ROUTER
// =====================================================
const categoriesRouter = {
  list: protectedProcedure.query(async () => {
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder)
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await db.select().from(categories).where(eq(categories.id, input.id))
      return result[0] || null
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(categories).values(input).returning()
      return result[0]
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const result = await db.update(categories).set(data).where(eq(categories.id, id)).returning()
      return result[0]
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(categories).set({ isActive: false }).where(eq(categories.id, input.id))
      return { success: true }
    }),
} satisfies TRPCRouterRecord

// =====================================================
// PRODUCTS ROUTER
// =====================================================
const productsRouter = {
  list: protectedProcedure.query(async () => {
    return db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        categoryId: products.categoryId,
        categoryName: categories.name,
        emoji: products.emoji,
        imageUrl: products.imageUrl,
        isAvailable: products.isAvailable,
        preparationTime: products.preparationTime,
        stock: products.stock,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(categories.sortOrder, products.name)
  }),

  listAvailable: protectedProcedure.query(async () => {
    return db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        categoryId: products.categoryId,
        categoryName: categories.name,
        emoji: products.emoji,
        imageUrl: products.imageUrl,
        isAvailable: products.isAvailable,
        preparationTime: products.preparationTime,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.isAvailable, true))
      .orderBy(categories.sortOrder, products.name)
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, input.id))
      return result[0] || null
    }),

  getByCategory: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(products)
        .where(and(eq(products.categoryId, input.categoryId), eq(products.isAvailable, true)))
        .orderBy(products.name)
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.string(),
        categoryId: z.number(),
        emoji: z.string().optional(),
        imageUrl: z.string().optional(),
        preparationTime: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(products).values(input).returning()
      return result[0]
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        categoryId: z.number().optional(),
        emoji: z.string().optional(),
        imageUrl: z.string().optional(),
        isAvailable: z.boolean().optional(),
        preparationTime: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const result = await db.update(products).set(data).where(eq(products.id, id)).returning()
      return result[0]
    }),

  toggleAvailability: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const product = await db.select().from(products).where(eq(products.id, input.id))
      if (product[0]) {
        const result = await db
          .update(products)
          .set({ isAvailable: !product[0].isAvailable })
          .where(eq(products.id, input.id))
          .returning()
        return result[0]
      }
      return null
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(products).set({ isAvailable: false }).where(eq(products.id, input.id))
      return { success: true }
    }),
} satisfies TRPCRouterRecord

// =====================================================
// TABLES ROUTER
// =====================================================
const tablesRouter = {
  list: protectedProcedure.query(async () => {
    return db
      .select({
        id: tables.id,
        tableNumber: tables.tableNumber,
        capacity: tables.capacity,
        status: tables.status,
        location: tables.location,
        currentOrderId: tables.currentOrderId,
        reservedFor: tables.reservedFor,
        currentOrderNumber: orders.orderNumber,
      })
      .from(tables)
      .leftJoin(orders, eq(tables.currentOrderId, orders.id))
      .orderBy(tables.location, tables.tableNumber)
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await db.select().from(tables).where(eq(tables.id, input.id))
      return result[0] || null
    }),

  getAvailable: protectedProcedure.query(async () => {
    return db.select().from(tables).where(eq(tables.status, 'available')).orderBy(tables.tableNumber)
  }),

  // Get all tables for POS (available and occupied with their current orders)
  getAllForPOS: protectedProcedure.query(async () => {
    return db
      .select({
        id: tables.id,
        tableNumber: tables.tableNumber,
        capacity: tables.capacity,
        status: tables.status,
        location: tables.location,
        currentOrderId: tables.currentOrderId,
      })
      .from(tables)
      .where(
        or(
          eq(tables.status, 'available'),
          eq(tables.status, 'occupied')
        )
      )
      .orderBy(tables.tableNumber)
  }),

  // Get active order for a specific table
  getActiveOrder: publicProcedure
    .input(z.object({ tableId: z.number() }))
    .query(async ({ input }) => {
      const table = await db.select().from(tables).where(eq(tables.id, input.tableId))
      if (!table[0] || !table[0].currentOrderId) return null

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, table[0].currentOrderId))

      if (!order[0]) return null

      // Get order items
      const items = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          productName: products.name,
          productEmoji: products.emoji,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          subtotal: orderItems.subtotal,
          notes: orderItems.notes,
          status: orderItems.status,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order[0].id))

      return { ...order[0], items }
    }),

  getByLocation: publicProcedure
    .input(z.object({ location: z.string() }))
    .query(async ({ input }) => {
      return db.select().from(tables).where(eq(tables.location, input.location)).orderBy(tables.tableNumber)
    }),

  create: publicProcedure
    .input(
      z.object({
        tableNumber: z.string(),
        capacity: z.number(),
        location: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(tables).values(input).returning()
      return result[0]
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        tableNumber: z.string().optional(),
        capacity: z.number().optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const result = await db.update(tables).set(data).where(eq(tables.id, id)).returning()
      return result[0]
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(['available', 'occupied', 'reserved', 'cleaning']),
        reservedFor: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, status, reservedFor } = input
      const updateData: Record<string, unknown> = { status }
      if (status === 'reserved') {
        updateData.reservedFor = reservedFor
      } else if (status === 'available' || status === 'cleaning') {
        updateData.currentOrderId = null
        updateData.reservedFor = null
      }
      const result = await db.update(tables).set(updateData).where(eq(tables.id, id)).returning()
      return result[0]
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(tables).where(eq(tables.id, input.id))
      return { success: true }
    }),
} satisfies TRPCRouterRecord

// =====================================================
// ORDERS ROUTER
// =====================================================
const ordersRouter = {
  list: protectedProcedure.query(async () => {
    return db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        status: orders.status,
        tableId: orders.tableId,
        tableNumber: tables.tableNumber,
        serverId: orders.serverId,
        serverName: users.fullName,
        subtotal: orders.subtotal,
        taxAmount: orders.taxAmount,
        discountAmount: orders.discountAmount,
        total: orders.total,
        isPaid: sql<boolean>`CASE WHEN EXISTS (SELECT 1 FROM payments WHERE payments.order_id = ${orders.id} AND payments.status = 'paid') THEN TRUE ELSE FALSE END`,
        notes: orders.notes,
        createdAt: orders.createdAt,
        completedAt: orders.completedAt,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.tableId, tables.id))
      .leftJoin(users, eq(orders.serverId, users.id))
      .orderBy(desc(orders.createdAt))
  }),

  listActive: protectedProcedure.query(async () => {
    return db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        status: orders.status,
        tableId: orders.tableId,
        tableNumber: tables.tableNumber,
        serverId: orders.serverId,
        serverName: users.fullName,
        subtotal: orders.subtotal,
        taxAmount: orders.taxAmount,
        total: orders.total,
        notes: orders.notes,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.tableId, tables.id))
      .leftJoin(users, eq(orders.serverId, users.id))
      .where(and(ne(orders.status, 'completed'), ne(orders.status, 'cancelled')))
      .orderBy(orders.createdAt)
  }),

  listForKitchen: protectedProcedure.query(async () => {
    // Get orders that are not completed/cancelled and have pending/preparing items
    // This ensures orders with new items show up even if some items are already served
    const kitchenOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        status: orders.status,
        tableNumber: tables.tableNumber,
        createdAt: orders.createdAt,
        serverName: users.fullName,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.tableId, tables.id))
      .leftJoin(users, eq(orders.serverId, users.id))
      .where(
        and(
          ne(orders.status, 'completed'),
          ne(orders.status, 'cancelled')
        )
      )
      .orderBy(orders.createdAt)

    // Get items for each order with the server who added them
    const ordersWithItems = await Promise.all(
      kitchenOrders.map(async (order) => {
        const items = await db
          .select({
            id: orderItems.id,
            productId: orderItems.productId,
            name: products.name,
            quantity: orderItems.quantity,
            status: orderItems.status,
            notes: orderItems.notes,
            createdAt: orderItems.createdAt,
            serverName: users.fullName,
            category: products.categoryId,
          })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .leftJoin(users, eq(orderItems.serverId, users.id))
          .where(eq(orderItems.orderId, order.id))
          .orderBy(orderItems.createdAt)
        return { ...order, items }
      })
    )
    
    // Filter to only show orders that have at least one pending, preparing, or ready item
    // This ensures kitchen sees orders with new items even if some items were already served
    return ordersWithItems.filter((order) => 
      order.items.some((item) => 
        item.status === 'pending' || item.status === 'preparing' || item.status === 'ready'
      )
    )
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const order = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          orderType: orders.orderType,
          status: orders.status,
          tableId: orders.tableId,
          tableNumber: tables.tableNumber,
          serverId: orders.serverId,
          serverName: users.fullName,
          subtotal: orders.subtotal,
          taxAmount: orders.taxAmount,
          discountAmount: orders.discountAmount,
          total: orders.total,
          notes: orders.notes,
          createdAt: orders.createdAt,
          completedAt: orders.completedAt,
        })
        .from(orders)
        .leftJoin(tables, eq(orders.tableId, tables.id))
        .leftJoin(users, eq(orders.serverId, users.id))
        .where(eq(orders.id, input.id))

      if (!order[0]) return null

      const items = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          name: products.name,
          serverName: users.fullName,
          emoji: products.emoji,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          subtotal: orderItems.subtotal,
          status: orderItems.status,
          notes: orderItems.notes,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(users, eq(orderItems.serverId, users.id))
        .where(eq(orderItems.orderId, input.id))

      return { ...order[0], items }
    }),

  create: publicProcedure
    .input(
      z.object({
        orderType: z.enum(['dine_in', 'takeaway', 'delivery']),
        tableId: z.number().optional(),
        serverId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Generate order number
      const lastOrder = await db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .orderBy(desc(orders.id))
        .limit(1)
      
      let nextNum = 1
      if (lastOrder[0]) {
        const match = lastOrder[0].orderNumber.match(/ORD-(\d+)/)
        if (match) nextNum = parseInt(match[1]) + 1
      }
      const orderNumber = `ORD-${String(nextNum).padStart(3, '0')}`

      const result = await db
        .insert(orders)
        .values({ ...input, orderNumber })
        .returning()

      // Update table status if dine-in
      if (input.tableId) {
        await db
          .update(tables)
          .set({ status: 'occupied', currentOrderId: result[0].id })
          .where(eq(tables.id, input.tableId))
      }

      return result[0]
    }),

  addItem: publicProcedure
    .input(
      z.object({
        orderId: z.number(),
        productId: z.number(),
        quantity: z.number().default(1),
        notes: z.string().optional(),
        serverId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get product price
      const product = await db.select().from(products).where(eq(products.id, input.productId))
      if (!product[0]) throw new Error('Product not found')

      const unitPrice = product[0].price
      const subtotal = String(parseFloat(unitPrice) * input.quantity)

      const result = await db
        .insert(orderItems)
        .values({
          orderId: input.orderId,
          productId: input.productId,
          quantity: input.quantity,
          unitPrice,
          subtotal,
          notes: input.notes,
          serverId: input.serverId,
        })
        .returning()

      // Update order totals
      await updateOrderTotals(input.orderId)

      return result[0]
    }),

  updateItemStatus: publicProcedure
    .input(
      z.object({
        itemId: z.number(),
        status: z.enum(['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled']),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .update(orderItems)
        .set({ status: input.status })
        .where(eq(orderItems.id, input.itemId))
        .returning()

      return result[0]
    }),
  
  removeItem: publicProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      // Get the orderId before deleting
      const item = await db.select().from(orderItems).where(eq(orderItems.id, input.itemId))
      if (!item[0]) throw new Error('Order item not found')
      const orderId = item[0].orderId

      await db.delete(orderItems).where(eq(orderItems.id, input.itemId))

      // Update order totals
      await updateOrderTotals(orderId)

      return { success: true }
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled']),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = { status: input.status }
      if (input.status === 'completed') {
        updateData.completedAt = new Date()
      }

      const result = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, input.id))
        .returning()

      // Update table status if completed or cancelled
      if (input.status === 'completed' || input.status === 'cancelled') {
        await db
          .update(tables)
          .set({ status: 'available', currentOrderId: null })
          .where(eq(tables.currentOrderId, input.id))
      }

      return result[0]
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // First update table status
      await db
        .update(tables)
        .set({ status: 'available', currentOrderId: null })
        .where(eq(tables.currentOrderId, input.id))

      // Delete order (cascade will delete items)
      await db.delete(orders).where(eq(orders.id, input.id))
      return { success: true }
    }),
} satisfies TRPCRouterRecord

// Helper function to update order totals
async function updateOrderTotals(orderId: number) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))
  
  const subtotal = items
    .filter(item => item.status !== 'cancelled')
    .reduce((sum, item) => sum + parseFloat(item.subtotal), 0)
  
  // Get tax rate from settings (default 10%)
  const taxSetting = await db.select().from(settings).where(eq(settings.key, 'tax_rate'))
  const taxRate = taxSetting[0] ? parseFloat(taxSetting[0].value || '10') : 10
  
  const taxAmount = subtotal * taxRate / 100
  const total = subtotal + taxAmount

  await db
    .update(orders)
    .set({
      subtotal: String(subtotal.toFixed(2)),
      taxAmount: String(taxAmount.toFixed(2)),
      total: String(total.toFixed(2)),
    })
    .where(eq(orders.id, orderId))
}

// =====================================================
// PAYMENTS ROUTER
// =====================================================
const paymentsRouter = {
  list: protectedProcedure.query(async () => {
    return db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        orderId: payments.orderId,
        orderNumber: orders.orderNumber,
        amount: payments.amount,
        method: payments.method,
        status: payments.status,
        transactionId: payments.transactionId,
        processedBy: payments.processedBy,
        processedByName: users.fullName,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(orders, eq(payments.orderId, orders.id))
      .leftJoin(users, eq(payments.processedBy, users.id))
      .orderBy(desc(payments.createdAt))
  }),

  getByOrderId: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(payments)
        .where(eq(payments.orderId, input.orderId))
        .orderBy(desc(payments.createdAt))
    }),

  create: publicProcedure
    .input(
      z.object({
        orderId: z.number(),
        amount: z.string(),
        method: z.enum(['cash', 'card', 'digital_wallet']),
        processedBy: z.string(),
        transactionId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Generate payment number
      const lastPayment = await db
        .select({ paymentNumber: payments.paymentNumber })
        .from(payments)
        .orderBy(desc(payments.id))
        .limit(1)
      
      let nextNum = 1
      if (lastPayment[0]) {
        const match = lastPayment[0].paymentNumber.match(/PAY-(\d+)/)
        if (match) nextNum = parseInt(match[1]) + 1
      }
      const paymentNumber = `PAY-${String(nextNum).padStart(3, '0')}`

      const result = await db
        .insert(payments)
        .values({ ...input, paymentNumber, status: 'paid' })
        .returning()

      // Get the order to find its tableId
      const order = await db.select().from(orders).where(eq(orders.id, input.orderId))

      // Update order status to completed
      await db
        .update(orders)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(orders.id, input.orderId))

      // Update table status if order has a table
      if (order[0]?.tableId) {
        await db
          .update(tables)
          .set({ status: 'available', currentOrderId: null })
          .where(eq(tables.id, order[0].tableId))
      }

      return result[0]
    }),

  refund: publicProcedure
    .input(z.object({ id: z.number(), processedBy: z.string() }))
    .mutation(async ({ input }) => {
      const result = await db
        .update(payments)
        .set({ status: 'refunded', processedBy: input.processedBy })
        .where(eq(payments.id, input.id))
        .returning()
      return result[0]
    }),
} satisfies TRPCRouterRecord

// =====================================================
// SETTINGS ROUTER
// =====================================================
const settingsRouter = {
  list: protectedProcedure.query(async () => {
    return db.select().from(settings).orderBy(settings.key)
  }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const result = await db.select().from(settings).where(eq(settings.key, input.key))
      return result[0] || null
    }),

  getMultiple: publicProcedure
    .input(z.object({ keys: z.array(z.string()) }))
    .query(async ({ input }) => {
      const result = await db.select().from(settings)
      return result.filter(s => input.keys.includes(s.key))
    }),

  update: publicProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.select().from(settings).where(eq(settings.key, input.key))
      if (existing[0]) {
        const result = await db
          .update(settings)
          .set({ value: input.value })
          .where(eq(settings.key, input.key))
          .returning()
        return result[0]
      } else {
        const result = await db.insert(settings).values(input).returning()
        return result[0]
      }
    }),

  updateMultiple: publicProcedure
    .input(z.object({ settings: z.array(z.object({ key: z.string(), value: z.string() })) }))
    .mutation(async ({ input }) => {
      for (const setting of input.settings) {
        const existing = await db.select().from(settings).where(eq(settings.key, setting.key))
        if (existing[0]) {
          await db.update(settings).set({ value: setting.value }).where(eq(settings.key, setting.key))
        } else {
          await db.insert(settings).values(setting)
        }
      }
      return { success: true }
    }),
} satisfies TRPCRouterRecord

// =====================================================
// REPORTS ROUTER
// =====================================================
const reportsRouter = {
  getDashboardStats: protectedProcedure.query(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Today's completed orders
    const todaysOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.status, 'completed'), gte(orders.createdAt, today)))

    const todaysRevenue = todaysOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0)
    const todaysOrderCount = todaysOrders.length
    const avgOrderValue = todaysOrderCount > 0 ? todaysRevenue / todaysOrderCount : 0

    // Active orders
    const activeOrders = await db
      .select()
      .from(orders)
      .where(and(ne(orders.status, 'completed'), ne(orders.status, 'cancelled')))

    // Table stats
    const allTables = await db.select().from(tables)
    const occupiedTables = allTables.filter(t => t.status === 'occupied').length
    const availableTables = allTables.filter(t => t.status === 'available').length

    return {
      todaysRevenue,
      todaysOrderCount,
      avgOrderValue,
      activeOrderCount: activeOrders.length,
      occupiedTables,
      availableTables,
      totalTables: allTables.length,
    }
  }),

  getSalesByDateRange: publicProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const start = new Date(input.startDate)
      const end = new Date(input.endDate)
      end.setHours(23, 59, 59, 999)

      return db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          orderType: orders.orderType,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, 'completed'),
            gte(orders.createdAt, start),
            lte(orders.createdAt, end)
          )
        )
        .orderBy(orders.createdAt)
    }),

  getTopProducts: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          productId: orderItems.productId,
          productName: products.name,
          categoryName: categories.name,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})::int`,
          totalRevenue: sql<number>`SUM(${orderItems.subtotal})::decimal`,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(eq(orders.status, 'completed'))
        .groupBy(orderItems.productId, products.name, categories.name)
        .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
        .limit(input.limit)

      return result
    }),

  getSalesByCategory: protectedProcedure.query(async () => {
    const result = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})::int`,
        totalRevenue: sql<number>`SUM(${orderItems.subtotal})::decimal`,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.status, 'completed'))
      .groupBy(categories.id, categories.name)
      .orderBy(sql`SUM(${orderItems.subtotal}) DESC`)

    return result
  }),

  getPaymentSummary: publicProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async () => {
      const query = db
        .select({
          method: payments.method,
          totalCount: sql<number>`COUNT(*)::int`,
          totalAmount: sql<number>`SUM(${payments.amount})::decimal`,
        })
        .from(payments)
        .where(eq(payments.status, 'paid'))
        .groupBy(payments.method)

      return query
    }),
} satisfies TRPCRouterRecord

// =====================================================
// MAIN ROUTER
// =====================================================
export const trpcRouter = createTRPCRouter({
  users: usersRouter,
  categories: categoriesRouter,
  products: productsRouter,
  tables: tablesRouter,
  orders: ordersRouter,
  payments: paymentsRouter,
  settings: settingsRouter,
  reports: reportsRouter,
})

export type TRPCRouter = typeof trpcRouter
