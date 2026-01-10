import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username, admin } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '../db'
import * as schema from '../db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username(),
    admin({
      defaultRole: 'server',
      adminRoles: ['admin'],
    }),
    tanstackStartCookies(), // Must be last plugin
  ],
  session: {
    expiresIn: 60 * 60 * 8, // 8 hours
    updateAge: 60 * 60, // Update session every hour
  },
  user: {
    // Map better-auth's expected field names to our Drizzle schema fields
    fields: {
      name: 'fullName', // better-auth uses 'name', we use 'fullName' in schema
    },
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'server',
      },
      phone: {
        type: 'string',
        required: false,
      },
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      banned: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      banReason: {
        type: 'string',
        required: false,
      },
      banExpires: {
        type: 'date',
        required: false,
      },
    },
  },
})
