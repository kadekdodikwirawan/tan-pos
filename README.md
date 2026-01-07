# 🍽️ TanStack POS — Modern Restaurant Management System

> **Transform your restaurant operations with a lightning-fast, real-time Point of Sale system built on cutting-edge web technologies.**

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker&logoColor=white)](https://docker.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Why TanStack POS?

Running a restaurant is hard enough. Your software shouldn't make it harder.

**TanStack POS** was built by people who understand the chaos of dinner rush—the server who needs to fire an order in seconds, the kitchen staff juggling a dozen tickets, the manager who needs real-time visibility into what's happening on the floor.

This isn't just another POS system. It's a **complete restaurant operations platform** designed for how modern restaurants actually work:

- 🚀 **Blazing fast** — Sub-second order entry, instant kitchen updates
- 📱 **Works everywhere** — Desktop, tablet, or TV displays
- 🔄 **Real-time sync** — Everyone sees the same data, instantly
- 🎯 **Role-optimized** — Each staff member gets exactly what they need

---

## 🖼️ See It In Action

### Overview Dashboard — Admin View
![Dashboard Admin Interface](image/manager-dashboard.png)
*Comprehensive insights into sales, active orders, and staff performance*

### Point of Sale — Speed Meets Simplicity
![Dashboard Server Interface](image/waiter-pos.png)
*Intuitive product grid with one-tap ordering, table management, and custom notes support*

### Kitchen Display — Built for the Line
![Dashboard Kitchen Interface](image/chef-KDS.png)
*Real-time order queue with item-level tracking, audio alerts, and touch-friendly controls*

---

## 🎯 Key Features

### For the Front of House

| Feature | Description |
|---------|-------------|
| **Quick Order Entry** | Tap-to-add products, quantity modifiers, and special instructions |
| **Table Management** | Visual floor plan with real-time status (available, occupied, reserved) |
| **Order Types** | Dine-in, takeaway, and delivery — each with tailored workflows |
| **Send to Kitchen** | Fire orders immediately or hold for coordinated service |
| **Flexible Payments** | Cash, card, and digital wallet support with split-check options |
| **Add to Open Orders** | Keep adding items to tables without closing the check |

### For the Kitchen

| Feature | Description |
|---------|-------------|
| **Real-Time Queue** | Orders appear instantly with item-by-item preparation tracking |
| **Item-Level Status** | Mark individual dishes ready — perfect for "as-ready" service |
| **Food vs Beverage Filter** | Focus on what matters — split kitchen and bar displays |
| **Audio Notifications** | Never miss a new order with configurable sound alerts |
| **Server Attribution** | See who ordered what, with timestamps for accountability |
| **Cancel Pending Items** | Remove items before preparation starts |

### For Management

| Feature | Description |
|---------|-------------|
| **Unified Dashboard** | See all active orders, table status, and daily revenue at a glance |
| **Staff Management** | Create accounts, assign roles, and manage permissions |
| **Sales Analytics** | Track revenue by day, product, or category |
| **Order History** | Complete audit trail with payment records |
| **System Settings** | Configure tax rates, receipt formats, and business details |

---

## 🔐 Role-Based Access

Every staff member gets a streamlined interface built for their job:

| Role | What They See | What They Can Do |
|------|---------------|------------------|
| **Admin** | Everything | Full system configuration and all interfaces |
| **Manager** | Dashboard + Reports | Oversight, refunds, and staff management |
| **Server** | POS (Dine-in) | Create and manage table orders |
| **Counter** | POS (All types) | All orders + payment processing |
| **Kitchen** | Kitchen Display | View orders and update preparation status |

---

## 🚀 Get Started in 60 Seconds

### Prerequisites
- [Docker](https://docker.com) installed and running
- That's it. Seriously.

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/tanstack-pos.git
cd tanstack-pos

# Start everything with Docker
docker-compose up -d

# Or if you prefer npm
npm install
npm run dev
```

**Access the app:** [http://localhost:3000](http://localhost:3000)

### Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Manager | `manager1` | `admin123` |
| Server | `server1` | `admin123` |
| Counter | `counter1` | `admin123` |
| Kitchen | `kitchen1` | `admin123` |

---

## 🛠️ Tech Stack

This project leverages a modern, production-ready stack:

**Frontend**
- **TanStack Start** — Full-stack React framework with file-based routing
- **React 19** — Latest concurrent features and server components
- **TanStack Query** — Smart caching and real-time data synchronization
- **TanStack Router** — Type-safe routing with automatic code splitting
- **Tailwind CSS v4** — Utility-first styling with lightning CSS
- **shadcn/ui** — Beautiful, accessible component primitives

**Backend**
- **tRPC** — End-to-end type safety between client and server
- **Drizzle ORM** — Type-safe database queries with zero overhead
- **PostgreSQL 15** — Battle-tested relational database
- **Zod** — Runtime validation with static type inference

**Infrastructure**
- **Docker Compose** — One-command development environment
- **Vite** — Sub-second HMR and optimized production builds

---

## 📁 Project Structure

```
tanstack-pos/
├── src/
│   ├── components/      # Reusable UI components
│   ├── routes/          # File-based routing (TanStack Router)
│   │   └── dashboard/   # Protected dashboard routes
│   ├── integrations/    # tRPC client and server setup
│   ├── db/              # Drizzle schema and database utilities
│   ├── lib/             # Shared utilities and auth context
│   └── hooks/           # Custom React hooks
├── database/
│   └── init/            # SQL initialization scripts
├── docker-compose.yml   # Container orchestration
└── drizzle.config.ts    # Database migration config
```

---

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🐛 **Bug reports** — Found something broken? Let us know
- 💡 **Feature requests** — Have an idea? Open a discussion
- 🔧 **Pull requests** — Ready to code? Check out open issues
- 📖 **Documentation** — Help others get started faster

---

## 💝 Support the Project

This project represents countless hours of development, design, and testing. If it's helped you:

- ⭐ **Star the repo** — It helps others discover the project
- 🐦 **Share it** — Tell other restaurant owners and developers
- ☕ **Buy me a coffee** — Fuel the late-night coding sessions

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FF813F?logo=buy-me-a-coffee&logoColor=white)](https://buymeacoffee.com/kadekdodik)

---

## 📄 License

MIT License — Use it, modify it, ship it. Just give credit where it's due.

---

<div align="center">

**Built with ❤️ for restaurants that refuse to settle for outdated software**

[Get Started](#-get-started-in-60-seconds) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>