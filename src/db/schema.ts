import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  decimal,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'manager',
  'server',
  'counter',
  'kitchen',
])

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
])

export const orderTypeEnum = pgEnum('order_type', [
  'dine_in',
  'takeaway',
  'delivery',
])

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'refunded',
  'cancelled',
])

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'card',
  'digital_wallet',
])

export const tableStatusEnum = pgEnum('table_status', [
  'available',
  'occupied',
  'reserved',
  'cleaning',
])

// Users table
export const users = pgTable('users', {
  id: serial().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('server'),
  email: varchar('email', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Categories table
export const categories = pgTable('categories', {
  id: serial().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 255 }),
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Products table
export const products = pgTable('products', {
  id: serial().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  imageUrl: varchar('image_url', { length: 255 }),
  emoji: varchar('emoji', { length: 10 }),
  sku: varchar('sku', { length: 50 }),
  stock: integer('stock').default(0),
  isAvailable: boolean('is_available').notNull().default(true),
  preparationTime: integer('preparation_time').default(10), // in minutes
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Tables table (restaurant tables)
export const tables = pgTable('tables', {
  id: serial().primaryKey(),
  tableNumber: varchar('table_number', { length: 20 }).notNull().unique(),
  capacity: integer('capacity').notNull().default(4),
  status: tableStatusEnum('status').notNull().default('available'),
  location: varchar('location', { length: 50 }), // e.g., 'indoor', 'outdoor', 'vip'
  currentOrderId: integer('current_order_id'),
  reservedFor: varchar('reserved_for', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Orders table
export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  orderType: orderTypeEnum('order_type').notNull().default('dine_in'),
  status: orderStatusEnum('status').notNull().default('pending'),
  tableId: integer('table_id').references(() => tables.id),
  customerId: integer('customer_id'),
  serverId: integer('server_id').references(() => users.id),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
})

// Order Items table
export const orderItems = pgTable('order_items', {
  id: serial().primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  serverId: integer('server_id').references(() => users.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Payments table
export const payments = pgTable('payments', {
  id: serial().primaryKey(),
  paymentNumber: varchar('payment_number', { length: 20 }).notNull().unique(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull().default('cash'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  transactionId: varchar('transaction_id', { length: 100 }),
  processedBy: integer('processed_by').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Settings table
export const settings = pgTable('settings', {
  id: serial().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  payments: many(payments),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}))

export const tablesRelations = relations(tables, ({ many }) => ({
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  server: one(users, {
    fields: [orders.serverId],
    references: [users.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  server: one(users, {
    fields: [orderItems.serverId],
    references: [users.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  processedByUser: one(users, {
    fields: [payments.processedBy],
    references: [users.id],
  }),
}))

// Types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type Table = typeof tables.$inferSelect
export type NewTable = typeof tables.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
